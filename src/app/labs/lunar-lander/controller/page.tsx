import type { Metadata, Viewport } from "next";
import LunarLanderController from "@/components/labs/lunar-lander-controller";
import { LUNAR_LANDER_PARTY } from "@/lib/labs/lunar-lander-party-protocol";
import { defaultMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...defaultMetadata({
    path: "/labs/lunar-lander/controller",
    title: "Lunar Lander Controller",
    description: "PartyKit phone controller for piloting a shared Lunar Lander ship.",
  }),
  appleWebApp: {
    capable: true,
    title: "Lander Stick",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
  themeColor: "#050510",
};

export default function LunarLanderControllerPage({
  searchParams,
}: {
  searchParams?: { room?: string };
}) {
  const room =
    typeof searchParams?.room === "string" && searchParams.room.length > 0
      ? searchParams.room
      : LUNAR_LANDER_PARTY.defaultRoom;
  return <LunarLanderController room={room} />;
}
