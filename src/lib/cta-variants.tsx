import type { ReactNode } from "react";

export type Variant = "A" | "B";

export type CtaConfig = {
  label: string;
  href: string;
  hint: string;
  Icon: () => ReactNode;
};

const GithubIcon = () => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
    className="shrink-0"
  >
    <path d="M12 .5a11.5 11.5 0 0 0-3.63 22.42c.57.1.78-.25.78-.55v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.31-1.27-1.66-1.27-1.66-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.06 11.06 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.13v3.16c0 .31.21.66.79.55A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
    className="shrink-0"
  >
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.99 0 1.78-.77 1.78-1.72V1.72C24 .77 23.21 0 22.22 0Z" />
  </svg>
);

export const VARIANT_CTAS: Record<Variant, CtaConfig> = {
  A: {
    label: "View GitHub",
    href: "https://github.com/alexkafer",
    hint: "// systems · prototypes · code",
    Icon: GithubIcon,
  },
  B: {
    label: "Connect on LinkedIn",
    href: "https://linkedin.alexkafer.com",
    hint: "// career · network · message",
    Icon: LinkedinIcon,
  },
};
