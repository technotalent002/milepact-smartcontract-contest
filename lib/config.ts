import { defineChain } from "viem";

export const localAnvil = defineChain({
  id: 31337,
  name: "Local Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] }
  }
});

export const CLIENT_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
export const FREELANCER_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
export const DEFAULT_AMOUNT_USDC = "10";
export const DEFAULT_METADATA_HASH = "local://cofounder-test";
