import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useSimulateContract,
} from "wagmi";
import { erc20ABI } from "../config/contracts";

export function useTokenApproval(
  tokenAddress: `0x${string}`,
  spenderAddress: `0x${string}`
) {
  const [isApproving, setIsApproving] = useState(false);
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  const { data: allowance } = useReadContract({
    address: tokenAddress,
    abi: erc20ABI,
    functionName: "allowance",
    args: address ? [address, spenderAddress] : undefined,
  });

  const approve = async () => {
    try {
      setIsApproving(true);
      const maxUint256 = BigInt(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      );

      await writeContract({
        address: tokenAddress,
        abi: erc20ABI,
        functionName: "approve",
        args: [spenderAddress, maxUint256],
      });
    } finally {
      setIsApproving(false);
    }
  };

  const needsApproval = (amount: bigint) => {
    return !allowance || allowance < amount;
  };

  return { approve, needsApproval, allowance, isApproving };
}
