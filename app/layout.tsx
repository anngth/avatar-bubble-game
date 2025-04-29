import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avatar Bubble Game",
  description: "A fun and interactive avatar bubble game!",
  generator: "Next.js",
  keywords: ["avatar", "bubble", "game", "interactive", "fun"],
  viewport: "width=device-width, initial-scale=1.0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
