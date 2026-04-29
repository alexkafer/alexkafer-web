"use client";

import Image from "next/image";
import { Section, SectionInner } from "@/components/section";

export function AboutSection() {
  return (
    <Section id="about" aria-label="About me" className="!min-h-0">
      <SectionInner className="flex flex-col gap-12">
        <div className="space-y-6">
          <p
            id="about-marker"
            className="ml-9 font-mono text-sm uppercase tracking-widest text-amber"
          >
            {"// 01 · ABOUT"}
          </p>
          <h2 className="text-balance font-sans text-4xl font-semibold leading-tight text-mute-100 md:text-6xl">
            <span className="block">PM by title.</span>
            <span className="mt-2 block text-cyan">
              Builder by instinct.
            </span>
          </h2>
        </div>

        <div className="grid gap-10 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:items-start md:gap-14">
          <div className="md:sticky md:top-24">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-lg border border-mute-700/40 shadow-lg">
              <Image
                src="/alex.jpg"
                alt="Alex Kafer"
                fill
                sizes="(min-width: 768px) 18rem, 80vw"
                className="object-cover"
                priority={false}
              />
            </div>
          </div>

          <div className="max-w-2xl space-y-4 text-pretty text-base leading-relaxed text-mute-300">
            <p>
              I&apos;ve been a builder since middle school. First a
              school newspaper site so I could tell stories with code, then
              apps for my teachers and e&#8209;cards for the family holiday
              card. High school is where I learned what it feels like to ship
              hardware on a deadline: I joined the robotics team, made drive
              team, and we won regionals. By senior year I&apos;d helped spin
              up 17 more robotics teams across elementary and middle schools
              in my district, because the community around the work mattered
              as much as the work.
            </p>
            <p>
              I studied CS in college with a focus on robotics and AI, but
              kept stacking product&#8209;design classes alongside the
              algorithms. My favorite thing I built was an interactive
              lightshow: guests scanned a QR code and steered the
              lights with the gyroscope in their phone. The kind of small
              interaction that delights the people who notice it.
            </p>
            <p>
              That&apos;s still the through&#8209;line. I love how one system
              feeds into another, and the small details most people won&apos;t
              catch are where being thoughtful and intentional actually
              matters.
            </p>
          </div>
        </div>
      </SectionInner>
    </Section>
  );
}

export default AboutSection;
