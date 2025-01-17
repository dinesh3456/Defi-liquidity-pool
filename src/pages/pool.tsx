// src/pages/pool.tsx
import { useState, useEffect } from "react";
import { parseEther, formatEther } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/config/contracts";
import { Button } from "@/components/common/Button";
import { useNotification } from "@/hooks/useNotification";
import { useTokenApproval } from "@/hooks/useTokenApproval";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { liquidityPoolABI } from "../config/contracts";
import { Layout } from "@/components/layout/Layout";
import { Loader2 } from "lucide-react";

export default function Pool() {
  const [mounted, setMounted] = useState(false);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const { address } = useAccount();
  const notify = useNotification();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Contract reads
  const { data: reserves } = useReadContract({
    address: CONTRACTS.liquidityPool.address as `0x${string}`,
    abi: liquidityPoolABI,
    functionName: "getReserves",
  });

  const { data: userShares } = useReadContract({
    address: CONTRACTS.liquidityPool.address as `0x${string}`,
    abi: liquidityPoolABI,
    functionName: "shares",
    args: address ? [address] : undefined,
  });

  // Get balances
  const { formattedBalance: balanceA, refetch: refetchBalanceA } =
    useTokenBalance(CONTRACTS.tokenA.address as `0x${string}`);

  const { formattedBalance: balanceB, refetch: refetchBalanceB } =
    useTokenBalance(CONTRACTS.tokenB.address as `0x${string}`);

  // Token approvals
  const {
    approve: approveA,
    needsApproval: needsApprovalA,
    isApproving: isApprovingA,
  } = useTokenApproval(
    CONTRACTS.tokenA.address as `0x${string}`,
    CONTRACTS.liquidityPool.address as `0x${string}`
  );

  const {
    approve: approveB,
    needsApproval: needsApprovalB,
    isApproving: isApprovingB,
  } = useTokenApproval(
    CONTRACTS.tokenB.address as `0x${string}`,
    CONTRACTS.liquidityPool.address as `0x${string}`
  );

  // Contract writes
  const { writeContract: addLiquidity, isPending: isAddingLiquidity } =
    useWriteContract();
  const { writeContract: removeLiquidity, isPending: isRemovingLiquidity } =
    useWriteContract();

  // Add liquidity handler
  const handleAddLiquidity = async () => {
    if (!amountA || !amountB) return;

    try {
      const amountAWei = parseEther(amountA);
      const amountBWei = parseEther(amountB);

      // Check and handle approvals
      if (needsApprovalA(amountAWei)) {
        notify.info("Approving Token A...");
        await approveA();
        notify.success("Token A Approved");
      }

      if (needsApprovalB(amountBWei)) {
        notify.info("Approving Token B...");
        await approveB();
        notify.success("Token B Approved");
      }

      notify.transaction.pending("Adding liquidity...");

      await addLiquidity({
        address: CONTRACTS.liquidityPool.address as `0x${string}`,
        abi: liquidityPoolABI,
        functionName: "addLiquidity",
        args: [amountAWei, amountBWei],
      });

      notify.transaction.success("Successfully added liquidity");

      // Reset form and refetch balances
      setAmountA("");
      setAmountB("");
      await Promise.all([refetchBalanceA(), refetchBalanceB()]);
    } catch (error) {
      notify.transaction.error("Failed to add liquidity");
      console.error("Add liquidity error:", error);
    }
  };
  // Remove liquidity handler
  const handleRemoveLiquidity = async () => {
    if (!userShares) return;

    try {
      notify.transaction.pending("Removing liquidity...");

      await removeLiquidity({
        address: CONTRACTS.liquidityPool.address as `0x${string}`,
        abi: liquidityPoolABI,
        functionName: "removeLiquidity",
        args: [userShares],
      });

      notify.transaction.success("Successfully removed liquidity");
      await Promise.all([refetchBalanceA(), refetchBalanceB()]);
    } catch (error) {
      notify.transaction.error("Failed to remove liquidity");
      console.error("Remove liquidity error:", error);
    }
  };

  if (!mounted) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6">Liquidity Pool</h1>

        {/* Token Balances */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-2">Your Balances</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">{CONTRACTS.tokenA.symbol}</p>
              <p className="text-lg font-medium">{balanceA}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{CONTRACTS.tokenB.symbol}</p>
              <p className="text-lg font-medium">{balanceB}</p>
            </div>
          </div>
        </div>

        {/* Pool Info */}
        {reserves && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-2">Pool Info</h2>
            <div className="space-y-1">
              <p>
                Token A Reserve: {formatEther(reserves[0])}{" "}
                {CONTRACTS.tokenA.symbol}
              </p>
              <p>
                Token B Reserve: {formatEther(reserves[1])}{" "}
                {CONTRACTS.tokenB.symbol}
              </p>
            </div>
          </div>
        )}

        {/* Add Liquidity Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl mb-4">Add Liquidity</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  {CONTRACTS.tokenA.symbol} Amount
                </label>
                <span className="text-sm text-gray-500">
                  Balance: {balanceA}
                </span>
              </div>
              <input
                type="number"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="0.0"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  {CONTRACTS.tokenB.symbol} Amount
                </label>
                <span className="text-sm text-gray-500">
                  Balance: {balanceB}
                </span>
              </div>
              <input
                type="number"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="0.0"
              />
            </div>

            <Button
              onClick={handleAddLiquidity}
              isLoading={isAddingLiquidity || isApprovingA || isApprovingB}
              disabled={!amountA || !amountB}
              className="w-full"
            >
              {isApprovingA || isApprovingB ? "Approving..." : "Add Liquidity"}
            </Button>
          </div>
        </div>

        {/* Remove Liquidity Section */}
        {userShares && Number(userShares) > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl mb-4">Your Position</h2>
            <div className="space-y-2">
              <p>LP Tokens: {formatEther(userShares)}</p>
              <Button
                variant="danger"
                onClick={handleRemoveLiquidity}
                isLoading={isRemovingLiquidity}
                className="w-full"
              >
                Remove Liquidity
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
