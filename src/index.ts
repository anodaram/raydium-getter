import { Connection, PublicKey } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import { LIQUIDITY_STATE_LAYOUT_V4 } from "@raydium-io/raydium-sdk";
import axios from "axios";

const RPC_URL = "https://api.mainnet-beta.solana.com";
const POOL_PAIRS_URL = "https://api.raydium.io/v2/main/pairs";

function commafy(num: number) {
	var str = num.toString().split(".");
	if (str[0].length >= 5) {
		str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, "$1,");
	}
	if (str[1] && str[1].length >= 5) {
		str[1] = str[1].replace(/(\d{3})/g, "$1 ");
	}
	return str.join(".");
}

async function getTokenMetadata(mintAddress: PublicKey) {
	const connection = new Connection(RPC_URL);
	const metaplex = Metaplex.make(connection);

	let tokenName;
	let tokenSymbol;

	const metadataAccount = metaplex
		.nfts()
		.pdas()
		.metadata({ mint: mintAddress });

	const metadataAccountInfo = await connection.getAccountInfo(metadataAccount);

	if (metadataAccountInfo) {
		const token = await metaplex
			.nfts()
			.findByMint({ mintAddress: mintAddress });
		tokenName = token.name;
		tokenSymbol = token.symbol;
	}
	return { tokenName, tokenSymbol };
}

async function getLiqPoolInfo(mintAddress: string) {
	const response = await axios.get(POOL_PAIRS_URL);
	const poolInfo = response.data.find(
		(pool: any) =>
			pool.baseMint === mintAddress || pool.quoteMint === mintAddress
	);
	if (!poolInfo) return {};
	const connection = new Connection(RPC_URL);
	const poolAddress = new PublicKey(poolInfo.ammId);
	const liquidity = poolInfo.liquidity;
	const liquidityPoolMint = new PublicKey(poolInfo.lpMint);
	const info = await connection.getAccountInfo(new PublicKey(poolAddress));
	if (!info) return {};
	const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);
	const decimals = parseInt(poolState.baseDecimal);
	// console.log(poolState);
	const quoteSymbol = (await getTokenMetadata(poolState.quoteMint)).tokenSymbol;
	const baseSymbol = (await getTokenMetadata(poolState.baseMint)).tokenSymbol;

	const lpInfo = (await connection.getParsedAccountInfo(
		liquidityPoolMint
	)) as any;
	const totalSupply =
		parseInt(lpInfo.value?.data?.parsed.info.supply) / 10 ** decimals;
	const lpReserve = poolState.lpReserve / 10 ** decimals;
	const locked = 1 - totalSupply / lpReserve;

	return {
		address: poolAddress.toBase58(),
		pair: `${baseSymbol} / ${quoteSymbol}`,
		liquidityPoolMint: liquidityPoolMint.toBase58(),
		liquidity: `$${commafy(Math.floor(liquidity))}`,
		locked: `${(locked * 100).toFixed(2)} %`,
	};
}

async function main() {
	console.log(
		await getLiqPoolInfo("9ceEjz32cv8jBcqsppgjrryiE2tor7PCm7j9mYk8gzTk")
	);
}

main();
