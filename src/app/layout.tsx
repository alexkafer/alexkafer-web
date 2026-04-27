import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/lib/lenis-provider";
import { buildPersonJsonLd, jsonLdScriptProps } from "@/lib/seo";
import { PROFILE } from "@/data/profile";

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
  title: `${PROFILE.name} — Senior PM, Xbox Platform`,
  description: PROFILE.summary,
  metadataBase: new URL(PROFILE.siteUrl),
  alternates: {
    canonical: `${PROFILE.siteUrl}/`,
  },
  openGraph: {
    type: "website",
    url: PROFILE.siteUrl,
    title: `${PROFILE.name} — Senior PM, Xbox Platform`,
    description: PROFILE.summary,
    siteName: PROFILE.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${PROFILE.name} — Senior PM, Xbox Platform`,
    description: PROFILE.summary,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-cyan focus:px-4 focus:py-2 focus:text-void"
        >
          Skip to content
        </a>
        <LenisProvider>{children}</LenisProvider>
        <script
          {...jsonLdScriptProps("ld-person-root", buildPersonJsonLd())}
        />
        <script
          type="application/x-ascii-art"
          dangerouslySetInnerHTML={{ __html: ASCII_EASTER_EGG }}
        />
      </body>
    </html>
  );
}
