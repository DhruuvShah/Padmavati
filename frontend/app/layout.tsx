import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { GlassProvider, GLASS_INIT_SCRIPT } from "@/components/ui/glass-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Padmavati Corporation",
  description: "Padmavati Corporation — product catalogue management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Runs before hydration so a returning user who turned glass off
            never sees a one-frame flash of it being on first. */}
        <Script id="glass-init" strategy="beforeInteractive">
          {GLASS_INIT_SCRIPT}
        </Script>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <GlassProvider>
            {children}
            <Toaster position="bottom-right" />
          </GlassProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
