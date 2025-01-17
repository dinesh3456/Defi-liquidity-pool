// src/pages/index.tsx
import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/common/Button";

export default function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();

  return (
    <Layout>
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <h1 className="text-4xl font-bold mb-6">Welcome to Liquidity Pool</h1>
        <p className="text-lg text-gray-600 mb-8">
          Swap tokens and provide liquidity with ease
        </p>

        {isConnected && (
          <div className="flex justify-center gap-4">
            <Button onClick={() => router.push("/swap")} className="px-8">
              Swap Tokens
            </Button>
            <Button
              onClick={() => router.push("/pool")}
              variant="secondary"
              className="px-8"
            >
              Add Liquidity
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
