import { useEffect } from "react";
import { useAccount, useReadContract, useBlockNumber } from "wagmi";
import { erc20ABI } from "../config/contracts";
import { formatEther } from "viem";

export function useTokenBalance(tokenAddress: `0x${string}`) {
  const { address } = useAccount();
  const { data: blockNumber } = useBlockNumber();

  const { data: balance, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Refresh balance when block number changes
  useEffect(() => {
    if (blockNumber) {
      refetch();
    }
  }, [blockNumber, refetch]);

  return {
    balance,
    formattedBalance: balance ? formatEther(balance) : "0",
    refetch,
  };
}
