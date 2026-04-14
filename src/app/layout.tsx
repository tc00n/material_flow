import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEONEX – Materialfluss-Analyse",
  description: "Materialfluss-Analyse-Tool für Unternehmensberater",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
