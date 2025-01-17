import { useState } from "react";
import { parseEther, formatEther } from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { ArrowDownUp } from "lucide-react";
import { CONTRACTS } from "@/config/contracts";
import { Button } from "@/components/common/Button";
import { useNotification } from "@/hooks/useNotification";
import { useTokenApproval } from "@/hooks/useTokenApproval";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { liquidityPoolABI } from "../../config/contracts";

export default function SwapComponent() {
  const [amount, setAmount] = useState("");
  const [tokenIn, setTokenIn] = useState<`0x${string}`>(
    CONTRACTS.tokenA.address as `0x${string}`
  );
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | null>(
    null
  );
  const { address } = useAccount();
  const notify = useNotification();
  const publicClient = usePublicClient();

  const tokenOut =
    tokenIn === CONTRACTS.tokenA.address
      ? CONTRACTS.tokenB.address
      : CONTRACTS.tokenA.address;

  // Get balances
  const { formattedBalance: balanceA, refetch: refetchBalanceA } =
    useTokenBalance(CONTRACTS.tokenA.address as `0x${string}`);

  const { formattedBalance: balanceB, refetch: refetchBalanceB } =
    useTokenBalance(CONTRACTS.tokenB.address as `0x${string}`);

  // Get expected output amount
  const { data: amountOut } = useReadContract({
    address: CONTRACTS.liquidityPool.address as `0x${string}`,
    abi: liquidityPoolABI,
    functionName: "getAmountOut",
    args: tokenIn && amount ? [tokenIn, parseEther(amount || "0")] : undefined,
  });

  // Token approval
  const { approve, needsApproval, isApproving } = useTokenApproval(
    tokenIn,
    CONTRACTS.liquidityPool.address as `0x${string}`
  );

  // Contract writes
  const { writeContractAsync: swap, isPending: isSwapping } =
    useWriteContract();

  // Watch for transaction confirmation
  const waitForTransaction = async (txHash: `0x${string}`) => {
    if (!publicClient) {
      notify.error("Network client not available");
      return;
    }

    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
      });

      // The status in the receipt is a number, let's handle it properly
      const isSuccess = Boolean(receipt.status); // Convert to boolean

      if (isSuccess) {
        await Promise.all([refetchBalanceA(), refetchBalanceB()]);

        notify.transaction.success("Transaction successful", txHash);
        setAmount("");
        setPendingTxHash(null);
      } else {
        notify.transaction.error("Transaction failed");
        setPendingTxHash(null);
      }
    } catch (error) {
      console.error("Transaction error:", error);
      notify.transaction.error("Error processing transaction");
      setPendingTxHash(null);
    }
  };

  // Swap handler
  const handleSwap = async () => {
    if (!amount || !amountOut) return;

    try {
      const amountInWei = parseEther(amount);
      const minAmountOut = (amountOut * BigInt(95)) / BigInt(100); // 5% slippage
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes

      // Check and handle approval
      if (needsApproval(amountInWei)) {
        notify.info("Approving token...");
        try {
          await approve();
          notify.success("Token Approved");
        } catch (error) {
          notify.error("Approval failed");
          return;
        }
      }

      // Show pending notification
      notify.transaction.pending("Swapping tokens...");

      const txHash = await swap({
        address: CONTRACTS.liquidityPool.address as `0x${string}`,
        abi: liquidityPoolABI,
        functionName: "swap",
        args: [tokenIn, amountInWei, minAmountOut, deadline],
      });

      setPendingTxHash(txHash);
      await waitForTransaction(txHash);
    } catch (error) {
      console.error("Swap error:", error);
      notify.transaction.error("Failed to swap tokens");
    }
  };
  // Switch tokens
  const handleSwitchTokens = () => {
    setTokenIn(tokenOut as `0x${string}`);
    setAmount("");
  };

  const currentBalance =
    tokenIn === CONTRACTS.tokenA.address ? balanceA : balanceB;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Swap Tokens</h1>

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

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="space-y-4">
          {/* Input Token */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                You Pay
              </label>
              <div className="text-right">
                <select
                  value={tokenIn}
                  onChange={(e) => setTokenIn(e.target.value as `0x${string}`)}
                  className="text-sm text-gray-600 mb-1"
                >
                  <option value={CONTRACTS.tokenA.address}>
                    {CONTRACTS.tokenA.symbol}
                  </option>
                  <option value={CONTRACTS.tokenB.address}>
                    {CONTRACTS.tokenB.symbol}
                  </option>
                </select>
                <p className="text-sm text-gray-500">
                  Balance: {currentBalance}
                </p>
              </div>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="0.0"
            />
          </div>

          {/* Switch Button */}
          <div className="flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSwitchTokens}
              className="rounded-full p-2"
            >
              <ArrowDownUp className="h-4 w-4" />
            </Button>
          </div>

          {/* Output Preview */}
          <div className="p-4 bg-gray-50 rounded">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                You Receive
              </span>
              <span className="text-sm text-gray-600">
                {tokenIn === CONTRACTS.tokenA.address
                  ? CONTRACTS.tokenB.symbol
                  : CONTRACTS.tokenA.symbol}
              </span>
            </div>
            <div className="text-2xl font-semibold">
              {amountOut ? formatEther(amountOut) : "0.0"}
            </div>
          </div>

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            isLoading={isSwapping || isApproving}
            disabled={!amount || !amountOut}
            className="w-full"
          >
            {isApproving ? "Approving..." : "Swap"}
          </Button>

          {/* Price Impact Info */}
          {amount && amountOut && (
            <div className="text-sm text-gray-500 text-center">
              Slippage Tolerance: 5%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
