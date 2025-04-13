import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GameProvider } from "./context/GameContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Guitar Learning App",
  description: "Learn to play guitar with interactive lessons",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
