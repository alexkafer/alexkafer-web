export type KeyboardControlAction =
  | { kind: "reset" }
  | { kind: "thrust" }
  | { kind: "rotate"; direction: -1 | 1 };

export function getKeyboardControlAction(
  code: string,
): KeyboardControlAction | null {
  if (code === "Space") return { kind: "reset" };
  if (code === "ArrowUp") return { kind: "thrust" };
  if (code === "ArrowLeft") return { kind: "rotate", direction: -1 };
  if (code === "ArrowRight") return { kind: "rotate", direction: 1 };
  return null;
}
