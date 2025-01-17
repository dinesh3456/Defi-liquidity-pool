// src/components/layout/Header.tsx
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useRouter } from "next/router";

export function Header() {
  const router = useRouter();

  const isActive = (path: string) => router.pathname === path;

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          Liquidity Pool
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/swap"
            className={`hover:text-blue-600 transition-colors ${
              isActive("/swap") ? "text-blue-600 font-semibold" : ""
            }`}
          >
            Swap
          </Link>
          <Link
            href="/pool"
            className={`hover:text-blue-600 transition-colors ${
              isActive("/pool") ? "text-blue-600 font-semibold" : ""
            }`}
          >
            Pool
          </Link>
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}
