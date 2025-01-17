import { useAccount, useReadContract } from "wagmi";
import { erc20ABI } from "../config/contracts";
import { formatEther } from "viem";

export function useTokenBalance(tokenAddress: `0x${string}`) {
  const { address } = useAccount();

  const { data: balance, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  return {
    balance,
    formattedBalance: balance ? formatEther(balance) : "0",
    refetch,
  };
}
