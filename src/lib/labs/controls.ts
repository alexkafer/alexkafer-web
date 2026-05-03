import type { LanderInput } from "./lander";

export type KeyboardControlAction =
  | { kind: "reset" }
  | { kind: "thrust" }
  | { kind: "rotate"; direction: -1 | 1 }
  | { kind: "lateral"; direction: -1 | 1 };

export type GamepadButtonLike = {
  pressed: boolean;
  value: number;
};

export type LunarLanderGamepadLike = {
  id: string;
  connected: boolean;
  axes: readonly number[];
  buttons: readonly GamepadButtonLike[];
};

export type LunarLanderGamepadControl = {
  id: string;
  input: LanderInput;
  spawn: boolean;
  reset: boolean;
  cameraPan: number;
};

const GAMEPAD_AXIS_DEAD_ZONE = 0.22;
const GAMEPAD_BUTTON_THRESHOLD = 0.5;
const GAMEPAD_AXIS_PRECISION = 100;

export function getKeyboardControlAction(code: string): KeyboardControlAction | null {
  if (code === "Space") return { kind: "reset" };
  if (code === "ArrowUp") return { kind: "thrust" };
  if (code === "ArrowLeft") return { kind: "rotate", direction: -1 };
  if (code === "ArrowRight") return { kind: "rotate", direction: 1 };
  if (code === "KeyQ") return { kind: "lateral", direction: -1 };
  if (code === "KeyE") return { kind: "lateral", direction: 1 };
  return null;
}

export function combineLanderInputs(...inputs: readonly LanderInput[]): LanderInput {
  return inputs.reduce<LanderInput>(
    (combined, input) => {
      const lateral =
        combined.lateral === undefined && input.lateral === undefined
          ? undefined
          : roundToPrecision(clamp((combined.lateral ?? 0) + (input.lateral ?? 0), -1, 1));

      return {
        thrust: combined.thrust || input.thrust,
        rotate: roundToPrecision(clamp(combined.rotate + input.rotate, -1, 1)),
        ...(lateral === undefined ? {} : { lateral }),
      };
    },
    { thrust: false, rotate: 0 },
  );
}

export function hasActiveLanderInput(input: LanderInput): boolean {
  return input.thrust || input.rotate !== 0 || (input.lateral ?? 0) !== 0;
}

export function getLunarLanderGamepadControl(
  gamepads: readonly (LunarLanderGamepadLike | null | undefined)[],
): LunarLanderGamepadControl | null {
  const gamepad = gamepads.find((candidate) => candidate?.connected);
  if (!gamepad) return null;

  const bumperRotate = digitalDirection(
    isButtonPressed(gamepad, 4) || isButtonPressed(gamepad, 14),
    isButtonPressed(gamepad, 5) || isButtonPressed(gamepad, 15),
  );

  const lateral = normalizeAxis(readAxis(gamepad, 2));

  return {
    id: gamepad.id,
    input: {
      thrust:
        isButtonPressed(gamepad, 0) || isButtonPressed(gamepad, 7) || isButtonPressed(gamepad, 12),
      rotate: bumperRotate || normalizeAxis(readAxis(gamepad, 0)),
      ...(lateral === 0 ? {} : { lateral }),
    },
    spawn: isButtonPressed(gamepad, 8) || isButtonPressed(gamepad, 9),
    reset: isButtonPressed(gamepad, 1) || isButtonPressed(gamepad, 3),
    cameraPan: lateral,
  };
}

function readAxis(gamepad: LunarLanderGamepadLike, index: number): number {
  const value = gamepad.axes[index] ?? 0;
  return Number.isFinite(value) ? value : 0;
}

function isButtonPressed(gamepad: LunarLanderGamepadLike, index: number): boolean {
  const button = gamepad.buttons[index];
  if (!button) return false;

  const value = Number.isFinite(button.value) ? button.value : 0;
  return Math.max(button.pressed ? 1 : 0, value) >= GAMEPAD_BUTTON_THRESHOLD;
}

function digitalDirection(negative: boolean, positive: boolean): -1 | 0 | 1 {
  if (negative === positive) return 0;
  return negative ? -1 : 1;
}

function normalizeAxis(value: number): number {
  if (Math.abs(value) <= GAMEPAD_AXIS_DEAD_ZONE) return 0;
  return roundToPrecision(clamp(value, -1, 1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToPrecision(value: number): number {
  return Math.round(value * GAMEPAD_AXIS_PRECISION) / GAMEPAD_AXIS_PRECISION;
}
