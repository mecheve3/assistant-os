import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Assistant 🤖",
  description: "Personal Operating System",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00d4aa" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Assistant" />
      </head>
      <body className="h-full bg-base text-bright font-sans antialiased">
        <div className="flex h-full overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <TopBar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
