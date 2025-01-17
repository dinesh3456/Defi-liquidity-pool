export const siteConfig = {
  name: "Liquidity Pool",
  description: "A decentralized liquidity pool for token swapping",
  networks: {
    baseSepolia: {
      chainId: 84532,
      name: "Base Sepolia",
      rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
      explorer: "https://sepolia.basescan.org",
    },
  },
}; 