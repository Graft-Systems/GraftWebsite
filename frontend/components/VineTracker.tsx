"use client";

import { useState, useEffect, useRef } from "react";

// Section positions where grape clusters appear (as % of total scroll)
const SECTION_MARKERS = [0.18, 0.38, 0.58, 0.78];

export default function VineTracker() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min(scrollTop / docHeight, 1);
        setScrollProgress(progress);
        setVisible(scrollTop > 100);
        rafRef.current = 0;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!visible) return null;

  // Vine path — organic S-curves
  const vineHeight = 92; // percent of viewport
  const vineTop = 4;

  return (
    <div
      className="fixed left-0 top-0 w-16 h-screen z-40 pointer-events-none hidden lg:block"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease" }}
    >
      <svg
        viewBox="0 0 60 800"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
      >
        {/* Main vine stem — organic wavy path */}
        <defs>
          <linearGradient id="vine-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5A7A3A" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3D5A24" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="vine-fill-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6B8F44" />
            <stop offset="100%" stopColor="#4A6B2E" />
          </linearGradient>
          <clipPath id="vine-progress-clip">
            <rect x="0" y="0" width="60" height={scrollProgress * 800} />
          </clipPath>
        </defs>

        {/* Background vine (dimmed) */}
        <path
          d="M 30 30
             C 35 80, 22 120, 28 170
             C 34 220, 20 260, 26 310
             C 32 360, 18 400, 24 450
             C 30 500, 16 540, 22 590
             C 28 640, 14 680, 20 730
             L 20 770"
          stroke="#3D5A24"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.15"
        />

        {/* Active vine (fills with scroll) */}
        <g clipPath="url(#vine-progress-clip)">
          <path
            d="M 30 30
               C 35 80, 22 120, 28 170
               C 34 220, 20 260, 26 310
               C 32 360, 18 400, 24 450
               C 30 500, 16 540, 22 590
               C 28 640, 14 680, 20 730
               L 20 770"
            stroke="url(#vine-gradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Tendrils curling off the vine */}
          {[120, 280, 440, 600, 720].map((y, i) => (
            <path
              key={`tendril-${i}`}
              d={
                i % 2 === 0
                  ? `M ${26 + (i % 3) * 2} ${y} C ${36 + i * 2} ${y - 10}, ${42 + i} ${y - 5}, ${40 + i * 2} ${y - 18}`
                  : `M ${26 - (i % 3)} ${y} C ${16 - i} ${y - 12}, ${10 - i} ${y - 8}, ${12 - i * 2} ${y - 22}`
              }
              stroke="#6B8F44"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.7"
            />
          ))}

          {/* Leaves at section markers */}
          {SECTION_MARKERS.map((pos, i) => {
            const y = 30 + pos * 740;
            const side = i % 2 === 0 ? 1 : -1;
            const vineX = getVineX(pos);
            const leafBaseX = vineX + side * 2;

            return (
              <g key={`leaf-group-${i}`} opacity={scrollProgress >= pos ? 1 : 0.12}
                 style={{ transition: "opacity 0.6s ease" }}>
                {/* Leaf stem */}
                <path
                  d={`M ${leafBaseX} ${y} L ${leafBaseX + side * 14} ${y - 6}`}
                  stroke="#5A7A3A"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                {/* Leaf shape — realistic grape leaf with lobes */}
                <g transform={`translate(${leafBaseX + side * 14}, ${y - 6}) scale(${side * 0.9}, 0.9)`}>
                  <path
                    d="M 0 0
                       C 3 -6, 8 -10, 12 -8
                       C 10 -12, 14 -14, 11 -6
                       C 16 -8, 14 -2, 12 0
                       C 16 2, 14 8, 10 6
                       C 12 10, 8 8, 6 4
                       C 4 8, 0 6, 0 0Z"
                    fill="#5A8A3A"
                    opacity="0.85"
                  />
                  {/* Leaf veins */}
                  <path d="M 0 0 L 8 -3" stroke="#4A7030" strokeWidth="0.6" opacity="0.5" />
                  <path d="M 0 0 L 7 3" stroke="#4A7030" strokeWidth="0.6" opacity="0.5" />
                  <path d="M 0 0 L 10 0" stroke="#4A7030" strokeWidth="0.7" opacity="0.5" />
                </g>

                {/* Small grape cluster */}
                <g transform={`translate(${leafBaseX + side * 6}, ${y + 8})`}
                   opacity={scrollProgress >= pos + 0.02 ? 1 : 0}
                   style={{ transition: "opacity 0.8s ease 0.2s" }}>
                  {/* Tiny stem */}
                  <path d={`M 0 -4 L 0 0`} stroke="#6B5A3A" strokeWidth="1" />
                  {/* Grape berries in natural cluster */}
                  <circle cx="0" cy="2" r="3" fill="#6B3A5A" opacity="0.85" />
                  <circle cx="-3.5" cy="4.5" r="2.8" fill="#7B4060" opacity="0.8" />
                  <circle cx="3.5" cy="4.5" r="2.8" fill="#7B4060" opacity="0.8" />
                  <circle cx="-1.5" cy="7.5" r="2.6" fill="#6B3A5A" opacity="0.75" />
                  <circle cx="1.5" cy="7.5" r="2.6" fill="#6B3A5A" opacity="0.75" />
                  <circle cx="0" cy="10" r="2.4" fill="#5B3050" opacity="0.7" />
                  {/* Highlight on top grape */}
                  <circle cx="-0.8" cy="1.2" r="0.8" fill="white" opacity="0.3" />
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// Get approximate X position on the vine at a given progress (0-1)
function getVineX(progress: number): number {
  // Matches the bezier curves in the SVG path approximately
  const t = progress;
  const wave = Math.sin(t * Math.PI * 5) * 5;
  return 25 + wave;
}
