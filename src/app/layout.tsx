import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/lib/lenis-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Alex Kafer — Senior PM, Xbox Platform",
  description: "Building secure, reliable platform services at billions/day.",
  metadataBase: new URL("https://alexkafer.com"),
  alternates: {
    canonical: "https://alexkafer.com/",
  },
  openGraph: {
    type: "website",
    url: "https://alexkafer.com",
    title: "Alex Kafer — Senior PM, Xbox Platform",
    description: "Building secure, reliable platform services at billions/day.",
    siteName: "Alex Kafer",
  },
  twitter: {
    card: "summary_large_image",
    title: "Alex Kafer — Senior PM, Xbox Platform",
    description: "Building secure, reliable platform services at billions/day.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050510",
};

const ASCII_EASTER_EGG = `
                  *       .            *
      .                   *      .           *
                *                .
            .         *      _          .
                            | |
          *      .  _ __ ___| | _____    *
                   | '__/ _ \\ |/ / _ \\      .
            .      | | |  __/   <  __/  *
                   |_|  \\___|_|\\_\\___|         *
            *               .            *

  // Hi. Built with care. Source: github.com/alexkafer/alexkafer
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body>
        <LenisProvider>{children}</LenisProvider>
        <script
          type="application/x-ascii-art"
          dangerouslySetInnerHTML={{ __html: ASCII_EASTER_EGG }}
        />
      </body>
    </html>
  );
}
