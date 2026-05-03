import type { Metadata, Viewport } from "next";
import LunarLanderController from "@/components/labs/lunar-lander-controller";
import { defaultMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...defaultMetadata({
    path: "/labs/lunar-lander/controller",
    title: "Lunar Lander Controller",
    description: "Phone controller for spawning and piloting a shared Lunar Lander MMO ship.",
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

export default function LunarLanderControllerPage() {
  return <LunarLanderController />;
}
