import type { Metadata } from "next";
import { defaultMetadata } from "@/lib/seo";
import Footer from "@/components/chrome/footer";
import QRArtClient from "./client";

export const metadata: Metadata = defaultMetadata({
  path: "/labs/qr-art",
  title: "QR Art Generator",
  description:
    "Embed pixel art directly into scannable QR codes by reverse-engineering the encoding pipeline.",
});

export default async function QRArtPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <>
      <main id="main-content" className="min-h-screen bg-void text-mute-100">
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          {code ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="font-mono text-sm uppercase tracking-widest text-cyan">
                {"// QR CODE SCANNED"}
              </p>
              <h1 className="mt-6 text-4xl font-semibold leading-tight md:text-5xl">
                QR code opened as:
              </h1>
              <p className="mt-6 rounded-xl border border-mute-700/50 bg-void-800/50 px-8 py-4 font-mono text-lg text-mute-100 md:text-2xl break-all">
                {code}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-10 max-w-3xl">
                <p className="font-mono text-sm uppercase tracking-widest text-cyan">
                  {"// QR ART GENERATOR"}
                </p>
                <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
                  Pixel art that <em>is</em> the data.
                </h1>
                <p className="mt-4 text-base leading-relaxed text-mute-300 md:text-lg">
                  Draw pixel art and watch it become a scannable QR code — not
                  through error correction, but by reverse-engineering the encoding
                  pipeline so your art pixels are valid encoded URL bytes.
                </p>
              </div>
              <QRArtClient />
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
