"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Navbar from "@/components/Navbar";
import VineTracker from "@/components/VineTracker";
const vineyardRowHero = "/attached_assets/about-hero.jpg";
const vineyardHorizonDark = "/attached_assets/vineyard-horizon-dark.jpg";
const headshotBenson = "/attached_assets/headshot-benson.jpg";
const headshotJacob = "/attached_assets/headshot-jacob.jpg";
const headshotKayan = "/attached_assets/headshot-kayan.jpg";
const headshotParth = "/attached_assets/headshot-parth.jpg";
const headshotViraaj = "/attached_assets/headshot-viraaj.jpg";
const headshotArnav = "/attached_assets/headshot-arnav.jpg";
const headshotAshka = "/attached_assets/headshot-ashka.jpg";

/* ─── Timeline data ─── */
const PAST_MILESTONES = [
  {
    date: "November 2025",
    title: "The Idea",
    description:
      "Benson and Jacob start prototyping in the attic of their house in Ann Arbor. Graft Systems is born.",
  },
  {
    date: "January 2026",
    title: "Michigan Build & Launch",
    description:
      "Selected for the Michigan Build & Launch accelerator. The concept evolves from sketch to working prototype.",
  },
  {
    date: "February 2026",
    title: "First Winery Conversations",
    description:
      "Conversations with winemakers shape the product direction. Real vineyard pain points guide every decision.",
  },
  {
    date: "March 2026",
    title: "Cluster Estimation",
    description:
      "Grape cluster weight estimation becomes the core product. One photo, one reliable number.",
  },
];

const FUTURE_MILESTONES = [
  {
    date: "May 2026",
    title: "On-Site Visits",
    description:
      "Meeting winemakers where they work — walking rows, understanding workflows, and refining the tool in the field.",
  },
  {
    date: "August 2026",
    title: "Ground Truth",
    description:
      "Collecting real harvest data to validate and improve our estimation models against actual yields.",
  },
  {
    date: "November 2026",
    title: "Launch",
    description:
      "A working estimation model paired with purpose-built capture hardware, ready for wineries to use in the field.",
  },
];

/* ─── Team data ─── */
const FOUNDERS = [
  {
    name: "Benson Klein",
    role: "Co-Founder",
    photo: headshotBenson,
    bio: "Junior at Michigan studying Economics & Art History. Benson brings experience from Morgan Stanley, the Nantucket Wine and Food Festival, and Chateau Troplong Mondot. He directs the team, builds features, and talks directly with wineries.",
    linkedin: "https://www.linkedin.com/in/benson-klein",
  },
  {
    name: "Jacob Tkaczyk (JT)",
    role: "Co-Founder",
    photo: headshotJacob,
    bio: "Senior at Michigan studying Computer Engineering. JT brings technical expertise from IBM and leads development as a Michigan Build & Launch Project Manager. His focus is hardware development for the modular cluster capture system.",
    linkedin: "https://www.linkedin.com/in/jacob-tkaczyk",
  },
];

const TEAM_MEMBERS = [
  {
    name: "Kayan Shah",
    role: "Business Development",
    photo: headshotKayan,
    bio: "Freshman studying BBA & PPE. Kayan leads outreach to wine producers, manages discovery calls, and develops pitch content. He bridges the gap between the product and market to position Graft as a trusted solution for vineyards.",
    linkedin: "https://www.linkedin.com/in/kayan-shah",
  },
  {
    name: "Parth Sinha",
    role: "Software Engineering",
    photo: headshotParth,
    bio: "Freshman studying Computer Science. Parth works on the machine learning pipeline, building a data augmentation system that generates realistic vineyard conditions to improve model robustness. His focus is applying practical ML and computer vision techniques to ensure Graft's models perform reliably in real-world settings.",
    linkedin: "https://www.linkedin.com/in/parth-sinha26",
  },
  {
    name: "Viraaj Nindra",
    role: "Software Engineering / ML",
    photo: headshotViraaj,
    bio: "Freshman studying Computer Science. Viraaj focuses on building machine learning and AI-driven features that provide producers with detailed vineyard-based insights. His work centers on improving the accuracy of ML models by expanding and refining data pipelines.",
    linkedin: "https://www.linkedin.com/in/viraaj-nindra",
  },
  {
    name: "Arnav Chittiprolu",
    role: "Software Engineering",
    photo: headshotArnav,
    bio: "Freshman studying Computer Science. Arnav focuses on building AI-powered compliance and machine learning features that deliver practical, vineyard-level insights for producers and simplify processes. His work centers on translating complex legal frameworks for wineries.",
    linkedin: "https://www.linkedin.com/in/arnav-chittiprolu",
  },
  {
    name: "Ashka Patel",
    role: "UX Design",
    photo: headshotAshka,
    bio: "Freshman studying BBA & Information Sciences — UX. Ashka focuses on both brand identity and user-centric design. She developed Graft's brand toolkit and led the redesign of the user dashboard and web platforms.",
    linkedin: "https://www.linkedin.com/in/ashka--patel",
  },
];

/* ─── SVG Vine connector for timelines ─── */
function TimelineVine({
  milestoneCount,
  scrollProgress,
  variant = "light",
}: {
  milestoneCount: number;
  scrollProgress: number;
  variant?: "light" | "dark";
}) {
  const totalHeight = milestoneCount * 120;
  const colors =
    variant === "light"
      ? { stem: "#5A7A3A", leaf: "#5A8A3A", grape: "#6B3A5A", tendril: "#6B8F44" }
      : { stem: "#C4A94D", leaf: "#B89A3D", grape: "#C4A94D", tendril: "#D4B95D" };

  // Build a wavy vine path
  const pathPoints: string[] = [`M 20 0`];
  for (let i = 0; i < totalHeight; i += 40) {
    const xOffset = Math.sin(i / 60) * 6;
    pathPoints.push(`C ${20 + xOffset + 3} ${i + 15}, ${20 + xOffset - 3} ${i + 25}, ${20 + Math.sin((i + 40) / 60) * 6} ${i + 40}`);
  }
  const pathD = pathPoints.join(" ");

  return (
    <svg
      viewBox={`0 0 40 ${totalHeight}`}
      className="absolute left-0 top-0 w-10 h-full"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <clipPath id={`vine-clip-${variant}`}>
          <rect x="0" y="0" width="40" height={scrollProgress * totalHeight} />
        </clipPath>
      </defs>

      {/* Background vine (dimmed) */}
      <path d={pathD} stroke={colors.stem} strokeWidth="2.5" opacity="0.15" strokeLinecap="round" />

      {/* Active vine (clips with scroll) */}
      <g clipPath={`url(#vine-clip-${variant})`}>
        <path d={pathD} stroke={colors.stem} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />

        {/* Leaves and grape clusters at each milestone */}
        {Array.from({ length: milestoneCount }).map((_, i) => {
          const y = i * 120 + 60;
          const side = i % 2 === 0 ? 1 : -1;
          const vx = 20 + Math.sin(y / 60) * 6;
          return (
            <g key={`vine-node-${i}`}>
              {/* Leaf */}
              <g transform={`translate(${vx + side * 8}, ${y - 4}) scale(${side * 0.7}, 0.7)`}>
                <path
                  d="M 0 0 C 3 -6, 8 -10, 12 -8 C 10 -12, 14 -14, 11 -6 C 16 -8, 14 -2, 12 0 C 16 2, 14 8, 10 6 C 12 10, 8 8, 6 4 C 4 8, 0 6, 0 0Z"
                  fill={colors.leaf}
                  opacity="0.8"
                />
              </g>
              {/* Mini grape cluster */}
              <circle cx={vx + side * 4} cy={y + 10} r="2.5" fill={colors.grape} opacity="0.7" />
              <circle cx={vx + side * 6.5} cy={y + 12} r="2" fill={colors.grape} opacity="0.6" />
              <circle cx={vx + side * 5} cy={y + 14} r="2.2" fill={colors.grape} opacity="0.65" />
              {/* Tendril */}
              <path
                d={`M ${vx} ${y - 15} C ${vx + side * 8} ${y - 22}, ${vx + side * 12} ${y - 18}, ${vx + side * 10} ${y - 26}`}
                stroke={colors.tendril}
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.5"
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/* ─── Headshot component ─── */
function Headshot({
  src,
  alt,
  size = 80,
}: {
  src: string;
  alt: string;
  size?: number;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

/* ─── Milestone Card ─── */
function MilestoneCard({
  date,
  title,
  description,
  index,
  variant = "light",
}: {
  date: string;
  title: string;
  description: string;
  index: number;
  variant?: "light" | "dark";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const isLeft = index % 2 === 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={`relative pl-16 py-4 ${variant === "dark" ? "text-cream" : "text-vineyard-earth"}`}
    >
      {/* Dot on the vine line */}
      <div
        className="absolute left-[18px] top-[22px] w-4 h-4 rounded-full border-2"
        style={{
          borderColor: variant === "dark" ? "#C4A94D" : "#8B2332",
          backgroundColor: isInView
            ? variant === "dark"
              ? "#C4A94D"
              : "#8B2332"
            : "transparent",
          transition: "background-color 0.6s ease",
        }}
      />

      <span
        className="text-sm font-semibold uppercase tracking-wider"
        style={{ color: variant === "dark" ? "#C4A94D" : "#8B2332" }}
      >
        {date}
      </span>
      <h3
        className="text-xl font-semibold mt-1"
        style={{ color: variant === "dark" ? "#F5F0E8" : "#2C1810" }}
      >
        {title}
      </h3>
      <p
        className="mt-1 text-base leading-relaxed"
        style={{
          color: variant === "dark" ? "rgba(245,240,232,0.75)" : "rgba(44,24,16,0.7)",
        }}
      >
        {description}
      </p>
    </motion.div>
  );
}

/* ─── Main About Page ─── */
export default function About() {
  const [pastScrollProgress, setPastScrollProgress] = useState(0);
  const [futureScrollProgress, setFutureScrollProgress] = useState(0);
  const pastRef = useRef<HTMLElement>(null);
  const futureRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Past timeline scroll progress
      if (pastRef.current) {
        const rect = pastRef.current.getBoundingClientRect();
        const sectionTop = rect.top + window.scrollY;
        const sectionHeight = rect.height;
        const scrolledInto = window.scrollY + window.innerHeight - sectionTop;
        const progress = Math.max(0, Math.min(scrolledInto / sectionHeight, 1));
        setPastScrollProgress(progress);
      }
      // Future timeline scroll progress
      if (futureRef.current) {
        const rect = futureRef.current.getBoundingClientRect();
        const sectionTop = rect.top + window.scrollY;
        const sectionHeight = rect.height;
        const scrolledInto = window.scrollY + window.innerHeight - sectionTop;
        const progress = Math.max(0, Math.min(scrolledInto / sectionHeight, 1));
        setFutureScrollProgress(progress);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const teamSectionRef = useRef<HTMLElement>(null);
  const teamInView = useInView(teamSectionRef, { once: true, margin: "-100px" });

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <VineTracker />

      {/* ═══ HERO ═══ */}
      <section className="relative h-[70vh] lg:h-[80vh] overflow-hidden">
        <img
          src={vineyardRowHero}
          alt="Vineyard row at golden hour"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl lg:text-6xl font-semibold text-white leading-tight"
          >
            Our Story
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="mt-8 text-white/60 text-sm flex flex-col items-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 4 L10 16 M5 11 L10 16 L15 11" />
            </svg>
          </motion.div>
        </div>
      </section>

      {/* ═══ WHERE WE'VE BEEN ═══ */}
      <section ref={pastRef} className="relative py-16 lg:py-20 bg-cream">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="text-3xl lg:text-4xl font-semibold text-vineyard-earth mb-16 text-center"
          >
            Where We've Been
          </motion.h2>

          <div className="relative">
            <TimelineVine
              milestoneCount={PAST_MILESTONES.length}
              scrollProgress={pastScrollProgress}
              variant="light"
            />
            {PAST_MILESTONES.map((m, i) => (
              <MilestoneCard key={m.date} {...m} index={i} variant="light" />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHERE WE'RE GOING ═══ */}
      <section
        ref={futureRef}
        className="relative py-16 lg:py-20 overflow-hidden"
      >
        <img
          src={vineyardHorizonDark}
          alt="Vineyard at twilight"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="text-3xl lg:text-4xl font-semibold text-cream mb-16 text-center"
          >
            Where We're Going
          </motion.h2>

          <div className="relative">
            <TimelineVine
              milestoneCount={FUTURE_MILESTONES.length}
              scrollProgress={futureScrollProgress}
              variant="dark"
            />
            {FUTURE_MILESTONES.map((m, i) => (
              <MilestoneCard key={m.date} {...m} index={i} variant="dark" />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE TEAM ═══ */}
      <section ref={teamSectionRef} className="py-20 lg:py-28 bg-cream">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="text-3xl lg:text-4xl font-semibold text-vineyard-earth mb-12"
          >
            The Team
          </motion.h2>

          {/* Founders — side-by-side centered cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {FOUNDERS.map((person, i) => (
              <motion.div
                key={person.name}
                initial={{ opacity: 0, y: 24 }}
                animate={teamInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.6,
                  delay: i * 0.12,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="bg-white rounded-xl p-8 border border-gray-200/60
                           flex flex-col items-center text-center"
              >
                <Headshot src={person.photo} alt={person.name} size={100} />
                <h3 className="text-lg font-semibold text-vineyard-earth mt-4">
                  {person.name}
                </h3>
                <span className="text-xs font-semibold uppercase tracking-widest text-brand-burgundy mt-1">
                  {person.role}
                </span>
                <p className="text-sm text-vineyard-earth/65 mt-3 leading-relaxed">
                  {person.bio}
                </p>
                <a
                  href={person.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 text-xs text-brand-burgundy/60 hover:text-brand-burgundy transition-colors"
                >
                  LinkedIn
                </a>
              </motion.div>
            ))}
          </div>

          {/* Rest of team — full-width horizontal cards */}
          <div className="flex flex-col gap-4">
            {TEAM_MEMBERS.map((person, i) => (
              <motion.div
                key={person.name}
                initial={{ opacity: 0, y: 20 }}
                animate={teamInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: 0.25 + i * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="bg-white rounded-xl p-6 border border-gray-200/60
                           flex items-start gap-5"
              >
                <Headshot src={person.photo} alt={person.name} size={64} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-vineyard-earth">
                    {person.name}
                  </h3>
                  <span className="text-xs font-semibold uppercase tracking-widest text-brand-burgundy">
                    {person.role}
                  </span>
                  <p className="text-sm text-vineyard-earth/60 mt-2 leading-relaxed">
                    {person.bio}
                  </p>
                  <a
                    href={person.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-brand-burgundy/60 hover:text-brand-burgundy transition-colors"
                  >
                    LinkedIn
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WALK WITH US (CTA) ═══ */}
      <section className="py-20 lg:py-24 bg-vineyard-earth text-center">
        <div className="max-w-2xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl lg:text-4xl font-semibold text-cream mb-4"
          >
            Walk With Us
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-cream/65 text-lg mb-8"
          >
            Whether you grow 5 acres or 500, we'd love to hear from you.
          </motion.p>
          <motion.a
            href="mailto:graftsystems@gmail.com"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="inline-block bg-brand-burgundy text-white font-semibold px-8 py-3 rounded-md
                       hover:bg-brand-burgundy-light transition-colors"
          >
            Get in Touch
          </motion.a>
          <p className="mt-4 text-cream/40 text-sm">graftsystems@gmail.com</p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-8 bg-vineyard-earth border-t border-white/5 text-center">
        <p className="text-cream/30 text-xs">
          © {new Date().getFullYear()} Graft Systems. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
