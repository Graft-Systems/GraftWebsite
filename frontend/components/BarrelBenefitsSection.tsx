"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
const barrelRoomBg = "/attached_assets/barrel-room-bg.jpg";

const BENEFITS = [
  {
    title: "Right-size barrel orders",
    description: "Know how many barrels you need before harvest — stop over-ordering cooperage or scrambling at the last minute.",
  },
  {
    title: "Plan harvest labor",
    description: "Hire the right crew size and schedule pick dates without guesswork.",
  },
  {
    title: "Earlier allocations",
    description: "Give distributors and club members accurate numbers months ahead of bottling.",
  },
  {
    title: "Order the right cases",
    description: "From glass to labels to shippers — every decision downstream starts with knowing your yield.",
  },
];

// Curved title SVG that arcs above the barrel
function CurvedTitle({ title, id, width }: { title: string; id: number; width: number }) {
  return (
    <svg
      viewBox="0 0 290 55"
      className="w-full"
      style={{ width, display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <path
          id={`arc-${id}`}
          d="M 15,50 Q 145,0 275,50"
        />
      </defs>
      <text
        fill="#F5F0E8"
        fontSize="17"
        fontWeight="600"
        fontFamily="'Titillium Web', sans-serif"
        letterSpacing="0.8"
      >
        <textPath
          xlinkHref={`#arc-${id}`}
          startOffset="50%"
          textAnchor="middle"
        >
          {title}
        </textPath>
      </text>
    </svg>
  );
}

// Barrel-top SVG — just the barrel visual, no title
function BarrelBody({ size, children, id }: { size: number; children: React.ReactNode; id: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 220 230" className="w-full h-full" fill="none">
        <defs>
          <radialGradient id={`woodGrain-${id}`} cx="45%" cy="40%">
            <stop offset="0%" stopColor="#D4A55A" />
            <stop offset="35%" stopColor="#C49548" />
            <stop offset="70%" stopColor="#B08040" />
            <stop offset="100%" stopColor="#8B6530" />
          </radialGradient>
          <radialGradient id={`highlight-${id}`} cx="35%" cy="30%">
            <stop offset="0%" stopColor="white" stopOpacity="0.25" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`rimGrad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6B4A30" />
            <stop offset="50%" stopColor="#5A3D25" />
            <stop offset="100%" stopColor="#4A2E1C" />
          </linearGradient>
          <linearGradient id={`metalBand-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A8A8A8" />
            <stop offset="30%" stopColor="#8A8A8A" />
            <stop offset="70%" stopColor="#6E6E6E" />
            <stop offset="100%" stopColor="#888888" />
          </linearGradient>
        </defs>

        {/* Barrel rim/side (depth) */}
        <ellipse cx="110" cy="120" rx="100" ry="100" fill="#3D2415" opacity="0.4" />
        <path
          d="M 10,110 A 100,100 0 0,0 210,110 L 210,125 A 100,100 0 0,1 10,125 Z"
          fill={`url(#rimGrad-${id})`}
        />
        <path
          d="M 10,110 A 100,100 0 0,0 210,110"
          stroke="#8B7355" strokeWidth="1" fill="none" opacity="0.5"
        />
        <path
          d="M 15,122 A 98,98 0 0,0 205,122"
          stroke={`url(#metalBand-${id})`} strokeWidth="3" fill="none" opacity="0.7"
        />
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (Math.PI * (i + 1)) / 9;
          const x = 110 + 99 * Math.cos(Math.PI - angle);
          return (
            <line
              key={`rimStave-${i}`}
              x1={x} y1={110} x2={x} y2={125}
              stroke="#4A2E1C" strokeWidth="0.7" opacity="0.35"
            />
          );
        })}

        {/* Top face */}
        <ellipse cx="110" cy="110" rx="100" ry="100" stroke={`url(#metalBand-${id})`} strokeWidth="4" fill="none" />
        <ellipse cx="110" cy="110" rx="96" ry="96" fill={`url(#woodGrain-${id})`} />

        {/* Wood plank lines */}
        {[-55, -30, -5, 20, 45].map((offset, i) => {
          const y = 110 + offset;
          const halfWidth = Math.sqrt(Math.max(0, 96 * 96 - offset * offset));
          return (
            <line
              key={`plank-${i}`}
              x1={110 - halfWidth} y1={y}
              x2={110 + halfWidth} y2={y}
              stroke="#7A5A35" strokeWidth="1" opacity="0.45"
            />
          );
        })}

        {/* Wood grain curves */}
        {[
          "M 50,80 Q 110,72 170,80",
          "M 40,100 Q 110,92 180,100",
          "M 42,130 Q 110,123 178,130",
          "M 55,150 Q 110,145 165,150",
        ].map((d, i) => (
          <path
            key={`grain-${i}`}
            d={d} stroke="#8B6B45" strokeWidth="0.6" fill="none" opacity="0.25"
          />
        ))}

        {/* Inner metal hoops */}
        <ellipse cx="110" cy="110" rx="75" ry="75" stroke="#9A9A9A" strokeWidth="2.5" fill="none" opacity="0.5" />
        <ellipse cx="110" cy="110" rx="50" ry="50" stroke="#9A9A9A" strokeWidth="2" fill="none" opacity="0.4" />

        {/* Center ring */}
        <circle cx="110" cy="110" r="14" stroke="#9A9A9A" strokeWidth="1.5" fill="none" opacity="0.3" />

        {/* Wood knots */}
        <ellipse cx="75" cy="90" rx="4" ry="3" fill="#7A5530" opacity="0.3" />
        <ellipse cx="150" cy="130" rx="3" ry="4" fill="#7A5530" opacity="0.25" />

        {/* Highlight */}
        <ellipse cx="95" cy="95" rx="60" ry="55" fill={`url(#highlight-${id})`} />

        {/* Outer shadow ring */}
        <ellipse cx="110" cy="110" rx="98" ry="98" stroke="#3D2415" strokeWidth="1" fill="none" opacity="0.3" />
      </svg>

      {/* Description text overlay */}
      <div
        className="absolute flex flex-col items-center justify-center px-5 text-center"
        style={{
          top: "10%",
          left: "10%",
          right: "10%",
          bottom: "15%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Roll order: first barrel rolls farthest (to slot 3 = far right),
// then fills right-to-left. Barrels roll in from the LEFT.
const ROLL_ORDER = [3, 2, 1, 0];

// Desktop: 270px barrels in a row. Mobile: 200px barrels stacked vertically.
const BARREL_SIZE_DESKTOP = 270;
const BARREL_SIZE_MOBILE = 200;

export default function BarrelBenefitsSection() {
  const [revealCount, setRevealCount] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const barrelSize = isMobile ? BARREL_SIZE_MOBILE : BARREL_SIZE_DESKTOP;

  const revealedSlots = ROLL_ORDER.slice(0, revealCount);

  const releaseBarrel = useCallback(() => {
    if (isRolling) return;
    if (revealCount >= BENEFITS.length) return;

    setIsRolling(true);
    setRevealCount((c) => c + 1);

    setTimeout(() => {
      setIsRolling(false);
    }, 1400);
  }, [revealCount, isRolling]);

  const allRevealed = revealCount >= BENEFITS.length;

  return (
    <section className="relative py-12 lg:py-16 overflow-hidden">
      {/* Barrel room background — top-down view */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${barrelRoomBg})` }}
      />
      <div className="absolute inset-0 bg-[#1a0e08]/70" />
      <div className="absolute top-0 left-0 right-0 h-px bg-cream/5" />

      <div className="max-w-[1320px] mx-auto px-4 lg:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-3"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-cream mb-2">
            Why It Matters
          </h2>
          <p className="text-cream/60 text-lg max-w-2xl mx-auto mb-1">
            Knowing your yield early changes everything downstream — from cooperage to client commitments.
          </p>
        </motion.div>

        {/* Roll button */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center mb-4"
        >
          {!allRevealed ? (
            <button
              onClick={releaseBarrel}
              disabled={isRolling}
              className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-base transition-all duration-300
                ${isRolling
                  ? "bg-vineyard-brown text-cream/30 cursor-wait"
                  : "bg-brand-burgundy text-white hover:bg-brand-burgundy-light cursor-pointer hover:scale-105 active:scale-95"
                }`}
              data-testid="button-release-barrel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
              </svg>
              {revealCount === 0
                ? "Roll a barrel to learn more"
                : `Roll another (${BENEFITS.length - revealCount} left)`}
            </button>
          ) : (
            <div className="text-cream/40 text-sm font-semibold">
              All benefits revealed
            </div>
          )}
        </motion.div>

        {/* Barrel rolling area
            Mobile (<lg): vertical stack, centered
            Desktop (lg+): horizontal row, same as before */}
        <div
          className={`relative flex items-center ${
            isMobile
              ? "flex-col gap-6 min-h-0"
              : "flex-row justify-center items-start gap-1 sm:gap-2 lg:gap-4 min-h-[340px]"
          }`}
        >
          {BENEFITS.map((benefit, slotIndex) => {
            const isRevealed = revealedSlots.includes(slotIndex);

            return (
              <div
                key={slotIndex}
                className="flex-shrink-0 flex flex-col items-center"
                style={{ width: barrelSize }}
              >
                <AnimatePresence>
                  {isRevealed && (
                    <>
                      {/* Curved title — fades in after barrel lands */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2, duration: 0.5 }}
                        style={{ width: barrelSize }}
                      >
                        <CurvedTitle title={benefit.title} id={slotIndex} width={barrelSize} />
                      </motion.div>

                      {/* Barrel body — rolls in from left on desktop, fades up on mobile */}
                      <motion.div
                        initial={
                          isMobile
                            ? { opacity: 0, y: 40, scale: 0.9 }
                            : { x: "-120vw", rotate: -720, opacity: 0 }
                        }
                        animate={
                          isMobile
                            ? { opacity: 1, y: 0, scale: 1 }
                            : { x: 0, rotate: 0, opacity: 1 }
                        }
                        transition={
                          isMobile
                            ? { type: "spring", damping: 20, stiffness: 100, duration: 0.8 }
                            : {
                                type: "spring",
                                damping: 22,
                                stiffness: 80,
                                duration: 1.4,
                                rotate: {
                                  type: "spring",
                                  damping: 18,
                                  stiffness: 60,
                                },
                              }
                        }
                      >
                        <BarrelBody size={barrelSize} id={slotIndex}>
                          <p className="text-cream/80 text-sm sm:text-[15px] leading-relaxed drop-shadow max-w-[200px]">
                            {benefit.description}
                          </p>
                        </BarrelBody>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Empty state overlay */}
          {revealCount === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center">
                <div className="opacity-20 mx-auto mb-4">
                  <BarrelBody size={isMobile ? 100 : 140} id={99}>
                    <span className="text-cream/50 text-xs">?</span>
                  </BarrelBody>
                </div>
                <p className="text-cream/25 text-sm">Click to roll your first barrel</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
