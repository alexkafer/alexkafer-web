"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;
function ensureRegistered() {
  if (registered) return;
  if (typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

if (typeof window !== "undefined") {
  ensureRegistered();
}

type UseGSAPArgs = Parameters<typeof useGSAP>;

export function useScrollTrigger(
  callback: UseGSAPArgs[0],
  config?: UseGSAPArgs[1],
) {
  ensureRegistered();
  return useGSAP(callback, config);
}

export function createScrollTimeline(
  opts: ScrollTrigger.Vars,
): gsap.core.Timeline {
  ensureRegistered();
  return gsap.timeline({ scrollTrigger: opts });
}

export default useScrollTrigger;
