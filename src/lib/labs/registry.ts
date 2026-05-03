export type LabStatus = "prototype" | "concept" | "field-note";
export type LabInteraction = "single-screen" | "paired-phone";

export type LabDefinition = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  href: string;
  order: number;
  status: LabStatus;
  interaction: LabInteraction;
  theme: {
    name: string;
    accent: "cyan" | "amber";
    background: string;
  };
};

const LAB_DEFINITIONS: readonly LabDefinition[] = [
  {
    slug: "lunar-lander",
    title: "Lunar Lander",
    eyebrow: "shared world prototype",
    summary:
      "A precision landing MMO where every desktop sees the same lunar surface and phones spawn live flight sticks.",
    href: "/labs/lunar-lander",
    order: 10,
    status: "prototype",
    interaction: "paired-phone",
    theme: {
      name: "mission control",
      accent: "cyan",
      background: "radial-gradient(circle at 50% 0%, #1e293b 0%, #050510 58%)",
    },
  },
  {
    slug: "story-relay",
    title: "Story Relay",
    eyebrow: "future slot",
    summary:
      "A placeholder for experiments where multiple devices reveal different slices of the same scene.",
    href: "/labs#story-relay",
    order: 20,
    status: "concept",
    interaction: "single-screen",
    theme: {
      name: "living archive",
      accent: "amber",
      background: "linear-gradient(135deg, #1f2937 0%, #0a0e1a 100%)",
    },
  },
];

export const LABS = [...LAB_DEFINITIONS].sort((a, b) => a.order - b.order);

export function getLabBySlug(slug: string): LabDefinition | undefined {
  return LABS.find((lab) => lab.slug === slug);
}
