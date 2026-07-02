import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripWise Web",
  description: "TripWise web frontend foundation using Next.js"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
