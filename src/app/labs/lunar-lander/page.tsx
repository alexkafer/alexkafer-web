import type { Metadata } from "next";
import LunarLanderGame from "@/components/labs/lunar-lander-game";
import { defaultMetadata } from "@/lib/seo";

export const metadata: Metadata = defaultMetadata({
  path: "/labs/lunar-lander",
  title: "Lunar Lander Lab",
  description:
    "A shared lunar lander MMO prototype with desktop spectators and phone pilots.",
});

export default function LunarLanderPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-black text-white lg:h-screen lg:overflow-hidden"
    >
      <div className="min-h-screen lg:h-full">
        <LunarLanderGame />
      </div>
    </main>
  );
}
