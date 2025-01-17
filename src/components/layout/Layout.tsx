// src/components/layout/Layout.tsx
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { NotificationContainer } from "../common/Notification";
import { useAccount } from "wagmi";
import { Header } from "./Header";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {!isConnected ? (
          <div className="max-w-lg mx-auto text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Connect Wallet
            </h2>
            <p className="text-gray-600">
              Please connect your wallet to use the app
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : (
          children
        )}
      </main>
      <NotificationContainer />
    </div>
  );
}
