import type { Metadata } from "next";
import LunarLanderGame from "@/components/labs/lunar-lander-game";
import { LUNAR_LANDER_PARTY } from "@/lib/labs/lunar-lander-party-protocol";
import { defaultMetadata } from "@/lib/seo";

export const metadata: Metadata = defaultMetadata({
  path: "/labs/lunar-lander",
  title: "Lunar Lander Lab",
  description:
    "A shared PixiJS and PartyKit lunar lander world with desktop pilots and phone flight sticks.",
});

export default function LunarLanderPage({
  searchParams,
}: {
  searchParams?: { room?: string };
}) {
  const room =
    typeof searchParams?.room === "string" && searchParams.room.length > 0
      ? searchParams.room
      : LUNAR_LANDER_PARTY.defaultRoom;
  return <LunarLanderGame room={room} />;
}
