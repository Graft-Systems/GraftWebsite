"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

type Person = {
  name: string;
  role: string;
  photo: string;
  bio: string;
  linkedin: string;
};

const FOUNDERS: Person[] = [
  {
    name: "Benson Klein",
    role: "Co-Founder",
    photo: "/team/headshot-benson.jpg",
    bio: "Junior at Michigan studying Economics and Art History. Experience from Morgan Stanley, the Nantucket Wine and Food Festival, and Chateau Troplong Mondot. Directs the team, builds features, talks to wineries.",
    linkedin: "https://www.linkedin.com/in/benson-klein",
  },
  {
    name: "Jacob Tkaczyk",
    role: "Co-Founder",
    photo: "/team/headshot-jacob.jpg",
    bio: "Senior at Michigan studying Computer Engineering. Technical experience from IBM. Michigan Build & Launch Project Manager. Leads hardware development for the modular cluster capture system.",
    linkedin: "https://www.linkedin.com/in/jacob-tkaczyk",
  },
];

const TEAM: Person[] = [
  {
    name: "Kayan Shah",
    role: "Business Development",
    photo: "/team/headshot-kayan.jpg",
    bio: "Freshman studying BBA & PPE. Leads outreach to wine producers, manages discovery calls, develops pitch content. Bridges product and market to position Graft as a trusted solution.",
    linkedin: "https://www.linkedin.com/in/kayan-shah",
  },
  {
    name: "Parth Sinha",
    role: "Software Engineering",
    photo: "/team/headshot-parth.jpg",
    bio: "Freshman studying Computer Science. Works on the ML pipeline — building a data augmentation system that generates realistic vineyard conditions to improve model robustness in the field.",
    linkedin: "https://www.linkedin.com/in/parth-sinha26",
  },
  {
    name: "Viraaj Nindra",
    role: "Software Engineering · ML",
    photo: "/team/headshot-viraaj.jpg",
    bio: "Freshman studying Computer Science. Builds ML and AI-driven features that deliver detailed vineyard-based insights, refining data pipelines to improve model accuracy.",
    linkedin: "https://www.linkedin.com/in/viraaj-nindra",
  },
  {
    name: "Arnav Chittiprolu",
    role: "Software Engineering",
    photo: "/team/headshot-arnav.jpg",
    bio: "Freshman studying Computer Science. Builds AI-powered compliance and ML features that deliver vineyard-level insights and translate complex legal frameworks for wineries.",
    linkedin: "https://www.linkedin.com/in/arnav-chittiprolu",
  },
  {
    name: "Ashka Patel",
    role: "UX Design",
    photo: "/team/headshot-ashka.jpg",
    bio: "Freshman studying BBA & Information Sciences (UX). Developed Graft's brand toolkit and led the redesign of the user dashboard and web platforms.",
    linkedin: "https://www.linkedin.com/in/ashka--patel",
  },
];

export function AboutTeam() {
  return (
    <section className="relative w-full bg-background py-28 lg:py-36">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
        <span className="frame text-[0.72rem] font-semibold text-sage">
          TEAM
        </span>
        <h2 className="display mt-5 text-display-lg text-foreground">
          The hands on this.
        </h2>

        {/* Founders — large vertical portraits, prominent */}
        <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-10 lg:gap-16">
          {FOUNDERS.map((p, i) => (
            <FounderCard key={p.name} person={p} index={i} />
          ))}
        </div>

        {/* Subsection heading for the rest of the team */}
        <div className="mt-24 border-t border-border/40 pt-14 lg:mt-28">
          <h3 className="display text-2xl leading-tight text-foreground lg:text-[1.75rem]">
            Michigan Build and Launch Team
          </h3>
        </div>

        {/* Team — compact horizontal cards */}
        <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-2 lg:gap-x-14">
          {TEAM.map((p, i) => (
            <TeamCard key={p.name} person={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FounderCard({ person, index }: { person: Person; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: 0.1 + index * 0.1, ease: [0.2, 0.9, 0.3, 1] }}
      className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8"
    >
      <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-sm border border-border/60 md:h-48 md:w-48">
        <Image
          src={person.photo}
          alt={person.name}
          fill
          sizes="(max-width: 768px) 160px, 192px"
          draggable={false}
          className="object-cover grayscale-[20%]"
        />
      </div>
      <div className="min-w-0 flex-1">
        <span className="frame block text-[0.62rem] text-foreground-muted">
          {person.role.toUpperCase()}
        </span>
        <h3 className="display mt-1.5 text-xl text-foreground lg:text-2xl">
          {person.name}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-foreground/75">
          {person.bio}
        </p>
        <a
          href={person.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="frame mt-4 inline-block text-[0.6rem] text-burgundy transition-colors hover:text-amber"
        >
          LINKEDIN →
        </a>
      </div>
    </motion.div>
  );
}

function TeamCard({ person, index }: { person: Person; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: 0.05 + index * 0.06, ease: [0.2, 0.9, 0.3, 1] }}
      className="flex items-start gap-5"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border/60">
        <Image
          src={person.photo}
          alt={person.name}
          fill
          sizes="80px"
          draggable={false}
          className="object-cover grayscale-[30%]"
        />
      </div>
      <div className="min-w-0 flex-1">
        <span className="frame block text-[0.55rem] text-foreground-muted">
          {person.role.toUpperCase()}
        </span>
        <h3 className="mt-0.5 text-sm font-semibold text-foreground">
          {person.name}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-foreground/65">
          {person.bio}
        </p>
        <a
          href={person.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="frame mt-2 inline-block text-[0.55rem] text-burgundy transition-colors hover:text-amber"
        >
          LINKEDIN →
        </a>
      </div>
    </motion.div>
  );
}
