// src/app/resume.json/route.ts
// JSON Resume schema (https://jsonresume.org/schema/) export.
// Sourced from PROFILE + RESUME_TIERS so it can never drift from /resume.

import { PROFILE, type ProfileLink } from "@/data/profile";
import { RESUME_TIERS } from "@/data/resume";

export const dynamic = "force-static";

type WorkEntry = {
  name: string;
  position: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
};

type EducationEntry = {
  institution: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
};

type AwardEntry = {
  title: string;
  awarder: string;
};

export async function GET() {
  const current = RESUME_TIERS.find((t) => t.id === "now")?.entries ?? [];
  const internships =
    RESUME_TIERS.find((t) => t.id === "internships")?.entries ?? [];
  const education = RESUME_TIERS.find((t) => t.id === "education")?.entries ?? [];
  const before = RESUME_TIERS.find((t) => t.id === "before")?.entries ?? [];

  const work: WorkEntry[] = [
    ...current.map((e) => ({
      name: e.name,
      position: PROFILE.jobTitle,
      summary: e.role,
    })),
    ...internships.map((e) => ({
      name: e.name,
      position: "Intern",
      summary: e.role,
    })),
  ];

  const educationOut: EducationEntry[] = education.map((e) => ({
    institution: e.name,
    studyType: e.role,
  }));

  const awards: AwardEntry[] = before.flatMap((e) =>
    (e.awards ?? []).map((a) => ({ title: a, awarder: e.name })),
  );

  const emailLink = PROFILE.links.find((l) => l.rel === "email");
  const email = emailLink?.url.replace(/^mailto:/, "");

  const NETWORK_BY_REL: Partial<Record<ProfileLink["rel"], string>> = {
    github: "GitHub",
    linkedin: "LinkedIn",
  };

  const resume = {
    $schema:
      "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
    basics: {
      name: PROFILE.name,
      label: `${PROFILE.jobTitle} · ${PROFILE.employer.team}`,
      url: PROFILE.siteUrl,
      ...(email ? { email } : {}),
      summary: PROFILE.summary,
      location: {
        city: PROFILE.location.locality,
        region: PROFILE.location.region,
        countryCode: PROFILE.location.country,
      },
      profiles: PROFILE.links
        .filter((l) => l.rel in NETWORK_BY_REL)
        .map((l) => ({
          network: NETWORK_BY_REL[l.rel as keyof typeof NETWORK_BY_REL]!,
          username: l.url.replace(/\/+$/, "").split("/").pop() ?? "",
          url: l.url,
        })),
    },
    work,
    education: educationOut,
    awards,
  };

  return new Response(JSON.stringify(resume, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
