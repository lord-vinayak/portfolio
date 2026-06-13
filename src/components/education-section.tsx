"use client";

import { useEffect, useState } from "react";
import BlurFade from "@/components/magicui/blur-fade";
import { ResumeCard } from "@/components/resume-card";
import { EasterEggPlayer } from "@/components/easter-egg-player";
import { DATA } from "@/data/resume";

const BLUR_FADE_DELAY = 0.04;
const NIT_SCHOOL = "National Institute of Technology Durgapur";

export function EducationSection() {
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "audio";
    link.href = "/audio/HHarry Styles - Sign of the Times.mp3";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  return (
    <>
      <section id="education">
        <div className="flex min-h-0 flex-col gap-y-3">
          <BlurFade delay={BLUR_FADE_DELAY * 7}>
            <h2 className="text-xl font-bold">Education</h2>
          </BlurFade>
          {DATA.education.map((education, id) => (
            <BlurFade
              key={education.school}
              delay={BLUR_FADE_DELAY * 8 + id * 0.05}
            >
              <ResumeCard
                key={education.school}
                href={education.href}
                logoUrl={education.logoUrl}
                altText={education.school}
                title={education.school}
                subtitle={education.degree}
                period={`${education.start} - ${education.end}`}
                onEasterEggClick={
                  education.school === NIT_SCHOOL
                    ? () => { if (!isPlayerOpen) setIsPlayerOpen(true); }
                    : undefined
                }
              />
            </BlurFade>
          ))}
        </div>
      </section>
      {isPlayerOpen && (
        <EasterEggPlayer onClose={() => setIsPlayerOpen(false)} />
      )}
    </>
  );
}
