import type { Metadata } from "next";
import "./globals.css";
import { GameProvider } from "./context/GameContext";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/modetoggle";



export const metadata: Metadata = {
  title: "Riffs – Hum. Play. Create.",
  description:
    "Riffs is a creative music app where you can hum a melody, convert it into guitar tabs, edit it, and jam out in a Guitar Hero-style gameplay experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GameProvider>
          {children}

          <div className="fixed bottom-4 right-4 z-50">
            <ModeToggle />
          </div>
          </GameProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
