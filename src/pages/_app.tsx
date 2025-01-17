// src/pages/_app.tsx
import { useEffect, useState } from "react";
import { Web3Provider } from "@/providers/web3";
import { NotificationProvider } from "@/contexts/NotificationContext";
import "@rainbow-me/rainbowkit/styles.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Web3Provider>
      <NotificationProvider>
        <Component {...pageProps} />
      </NotificationProvider>
    </Web3Provider>
  );
}
