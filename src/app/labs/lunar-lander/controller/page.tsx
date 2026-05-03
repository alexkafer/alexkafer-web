import type { Metadata } from "next";
import LunarLanderController from "@/components/labs/lunar-lander-controller";
import { defaultMetadata } from "@/lib/seo";

export const metadata: Metadata = defaultMetadata({
  path: "/labs/lunar-lander/controller",
  title: "Lunar Lander Controller",
  description: "Phone controller for the Lunar Lander living laboratory prototype.",
});

export default function LunarLanderControllerPage({
  searchParams,
}: {
  searchParams?: { pair?: string };
}) {
  return <LunarLanderController initialPairCode={searchParams?.pair} />;
}
