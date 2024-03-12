import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Metaplex } from "@metaplex-foundation/js";
import {
	TokenAccount,
	SPL_ACCOUNT_LAYOUT,
	LIQUIDITY_STATE_LAYOUT_V4,
} from "@raydium-io/raydium-sdk";
import axios from "axios";

const RPC_URL = "https://api.mainnet-beta.solana.com";
const POOL_ADDRESSES_URL =
	"https://api.raydium.io/v2/sdk/liquidity/mainnet.json";

async function getPoolAddressFromMint(mintAddress: string) {
	const response = await axios.get(POOL_ADDRESSES_URL);
	// console.log(response);
	const poolInfo = response.data.official.find(
		(pool: any) =>
			pool.baseMint === mintAddress || pool.quoteMint === mintAddress
	);
	if (poolInfo) return poolInfo.id;
	const poolInfo2 = response.data.unOfficial.find(
		(pool: any) =>
			pool.baseMint === mintAddress || pool.quoteMint === mintAddress
	);
	if (poolInfo2) return poolInfo2.id;
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
	const connection = new Connection(RPC_URL);
	// const poolAddress = await getPoolAddressFromMint(mintAddress);
	const poolAddress = "Crsqyrc9LW3KHJE1i6SXZimWbTpBkvfhuk8pvxbYJV16";
	if (!poolAddress) {
		console.log("Can't find such pool");
		return {};
	}
	const info = await connection.getAccountInfo(new PublicKey(poolAddress));
	if (!info) return {};
	const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);
	console.log(poolState);
  const quoteSymbol = (await getTokenMetadata(poolState.quoteMint)).tokenSymbol;
	const baseSymbol = (await getTokenMetadata(poolState.baseMint)).tokenSymbol;

	const liquidityPoolMint = poolState.lpMint.toBase58();
	const liquidity =
		poolState.lpReserve / 10 ** parseInt(poolState.quoteDecimal);
	const locked = "";


  console.log({
    volMaxCutRatio: poolState.volMaxCutRatio.toString(),
    amountWaveRatio: poolState.amountWaveRatio.toString(),
    swapBaseInAmount: poolState.swapBaseInAmount / 10 ** parseInt(poolState.quoteDecimal),
    swapBaseOutAmount: poolState.swapBaseOutAmount / 10 ** parseInt(poolState.quoteDecimal),
    swapQuoteInAmount: poolState.swapQuoteInAmount / 10 ** parseInt(poolState.quoteDecimal),
    swapQuoteOutAmount: poolState.swapQuoteOutAmount / 10 ** parseInt(poolState.quoteDecimal),
  });

	return {
		address: poolAddress,
		pair: `${baseSymbol} / ${quoteSymbol}`,
		liquidityPoolMint,
		liquidity,
		locked,
	};
}

async function main() {
	console.log(
		await getLiqPoolInfo("9ceEjz32cv8jBcqsppgjrryiE2tor7PCm7j9mYk8gzTk")
	);
	// console.log(await getLiqPoolInfo("58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2"));
}

main();

/*
Address: Crsqyrc9LW3KHJE1i6SXZimWbTpBkvfhuk8pvxbYJV16
Pair: BABYWIF / SOL
Liquidity pool mint: CxNEDGgmP1HhirRjCzket7cJTbH42ff8guJDc6jAy51c
Liquidity: $113,610
Locked: 98.80%
*/
