"use client";

import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type MotionGateProps = {
  children: ReactNode;
  fallback: ReactNode;
};

export function MotionGate({ children, fallback }: MotionGateProps) {
  const reduced = useReducedMotion();
  return <>{reduced ? fallback : children}</>;
}

export default MotionGate;
