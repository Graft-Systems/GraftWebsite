"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";

// Bell curve data
function gaussianCurve(mean: number, stdDev: number, points: number = 80): { x: number; y: number }[] {
  const data: { x: number; y: number }[] = [];
  const range = 4 * stdDev;
  const start = mean - range / 2;
  const step = range / points;
  for (let i = 0; i <= points; i++) {
    const x = start + i * step;
    const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) *
      Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    data.push({ x, y });
  }
  return data;
}

const scenarios = [
  { label: "Bear", desc: "Conservative", mean: 210, stdDev: 18, color: "#3B82F6", weight: 0.25 },
  { label: "Base", desc: "Most Likely", mean: 247, stdDev: 15, color: "#8B2332", weight: 0.50 },
  { label: "Bull", desc: "Optimistic", mean: 285, stdDev: 20, color: "#22C55E", weight: 0.25 },
];

// Blended = weighted average
const blendedValue = scenarios.reduce((sum, s) => sum + s.mean * s.weight, 0);
const BLENDED_COLOR = "#D97706";

export default function EstimationGraphSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.4 });
  const [animatedValue, setAnimatedValue] = useState(0);
  const [activeScenario, setActiveScenario] = useState<number | "blended">("blended");

  const targetValue = activeScenario === "blended"
    ? blendedValue
    : scenarios[activeScenario].mean;

  useEffect(() => {
    if (!isInView) {
      setAnimatedValue(0);
      return;
    }
    const duration = 800;
    const start = performance.now();
    const startVal = animatedValue;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(Math.round((startVal + eased * (targetValue - startVal)) * 10) / 10);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, activeScenario]);

  // SVG dimensions
  const svgW = 700;
  const svgH = 300;
  const padL = 50;
  const padR = 30;
  const padT = 40;
  const padB = 60;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const xMin = 160;
  const xMax = 330;
  const yMax = 0.032;

  const toSvgX = (val: number) => padL + ((val - xMin) / (xMax - xMin)) * plotW;
  const toSvgY = (val: number) => padT + plotH - (val / yMax) * plotH;

  const curvePath = (mean: number, stdDev: number) => {
    const data = gaussianCurve(mean, stdDev);
    const points = data
      .filter((d) => d.x >= xMin && d.x <= xMax)
      .map((d) => `${toSvgX(d.x)},${toSvgY(d.y)}`)
      .join(" L ");
    return `M ${points}`;
  };

  const filledPath = (mean: number, stdDev: number) => {
    const data = gaussianCurve(mean, stdDev)
      .filter((d) => d.x >= xMin && d.x <= xMax);
    const points = data.map((d) => `${toSvgX(d.x)},${toSvgY(d.y)}`).join(" L ");
    const firstX = toSvgX(data[0].x);
    const lastX = toSvgX(data[data.length - 1].x);
    const baseline = toSvgY(0);
    return `M ${firstX},${baseline} L ${points} L ${lastX},${baseline} Z`;
  };

  const xTicks = [170, 190, 210, 230, 250, 270, 290, 310, 325];

  const activeColor = activeScenario === "blended"
    ? BLENDED_COLOR
    : scenarios[activeScenario].color;

  const activeLabel = activeScenario === "blended"
    ? "Blended estimate — weighted across all scenarios"
    : `${scenarios[activeScenario].label} case — ${scenarios[activeScenario].desc.toLowerCase()}`;

  return (
    <section ref={sectionRef} className="bg-vineyard-earth py-16 lg:py-20 relative">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-semibold text-cream mb-3">
            Estimation Range
          </h2>
          <p className="text-cream/60 text-lg max-w-2xl mx-auto">
            Our model targets 95% accuracy. To account for the 5% margin, every estimate
            includes bear, base, and bull cases — plus a blended final weight.
          </p>
        </motion.div>

        {/* Scenario cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {scenarios.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setActiveScenario(i)}
              className={`rounded-xl p-4 text-center transition-all duration-200 border ${
                activeScenario === i
                  ? "border-cream/30 scale-[1.02]"
                  : "border-cream/8 hover:border-cream/15"
              }`}
              style={{
                backgroundColor: activeScenario === i ? s.color + "20" : "rgba(245,240,232,0.04)",
              }}
              data-testid={`button-scenario-${s.label.toLowerCase()}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                style={{ color: s.color }}>{s.label}</p>
              <p className="text-2xl font-semibold text-cream">{s.mean}g</p>
              <p className="text-[10px] text-cream/40">{s.desc}</p>
            </button>
          ))}
          <button
            onClick={() => setActiveScenario("blended")}
            className={`rounded-xl p-4 text-center transition-all duration-200 border ${
              activeScenario === "blended"
                ? "border-cream/30 scale-[1.02]"
                : "border-cream/8 hover:border-cream/15"
            }`}
            style={{
              backgroundColor: activeScenario === "blended" ? BLENDED_COLOR + "20" : "rgba(245,240,232,0.04)",
            }}
            data-testid="button-scenario-blended"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: BLENDED_COLOR }}>Blended</p>
            <p className="text-2xl font-semibold text-cream">{Math.round(blendedValue * 10) / 10}g</p>
            <p className="text-[10px] text-cream/40">Final Estimate</p>
          </button>
        </div>

        {/* Big animated number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-baseline gap-2">
            <span className="text-6xl sm:text-7xl font-semibold text-cream tabular-nums">
              {animatedValue.toFixed(1)}
            </span>
            <span className="text-2xl text-cream/60">grams</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: activeColor }}
            />
            <span className="text-cream/50 text-sm">{activeLabel}</span>
          </div>
        </motion.div>

        {/* Graph */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="bg-vineyard-brown/40 rounded-xl p-4 sm:p-6 border border-cream/5"
        >
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              {scenarios.map((s, i) => (
                <linearGradient key={i} id={`fill-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={
                    activeScenario === i || activeScenario === "blended" ? 0.3 : 0.06
                  } />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>

            {/* Grid lines */}
            {xTicks.map((tick) => (
              <line
                key={tick}
                x1={toSvgX(tick)}
                y1={padT}
                x2={toSvgX(tick)}
                y2={padT + plotH}
                stroke="#F5F0E8"
                strokeOpacity="0.06"
                strokeDasharray="2 4"
              />
            ))}

            {/* X axis */}
            <line
              x1={padL}
              y1={padT + plotH}
              x2={padL + plotW}
              y2={padT + plotH}
              stroke="#F5F0E8"
              strokeOpacity="0.15"
            />

            {/* X axis labels */}
            {xTicks.map((tick) => (
              <text
                key={tick}
                x={toSvgX(tick)}
                y={padT + plotH + 24}
                textAnchor="middle"
                fill="#F5F0E8"
                fillOpacity="0.4"
                fontSize="11"
                fontFamily="Titillium Web"
              >
                {tick}g
              </text>
            ))}

            <text
              x={svgW / 2}
              y={svgH - 4}
              textAnchor="middle"
              fill="#F5F0E8"
              fillOpacity="0.3"
              fontSize="11"
              fontFamily="Titillium Web"
            >
              Cluster Weight (grams)
            </text>

            {/* All curves */}
            {scenarios.map((s, i) => {
              const isActive = activeScenario === i;
              const isBlended = activeScenario === "blended";
              return (
                <g key={i} opacity={isActive ? 1 : isBlended ? 0.7 : 0.2}>
                  <path d={filledPath(s.mean, s.stdDev)} fill={`url(#fill-${i})`} />
                  <path
                    d={curvePath(s.mean, s.stdDev)}
                    stroke={s.color}
                    strokeWidth={isActive ? 2.5 : isBlended ? 2 : 1.5}
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            {/* Mean lines for active scenario */}
            {activeScenario !== "blended" && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: isInView ? 1 : 0 }}
                transition={{ duration: 0.6 }}
              >
                <line
                  x1={toSvgX(scenarios[activeScenario].mean)}
                  y1={padT}
                  x2={toSvgX(scenarios[activeScenario].mean)}
                  y2={padT + plotH}
                  stroke={scenarios[activeScenario].color}
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.6"
                />
                <rect
                  x={toSvgX(scenarios[activeScenario].mean) - 28}
                  y={padT - 8}
                  width="56"
                  height="22"
                  rx="4"
                  fill={scenarios[activeScenario].color}
                  opacity="0.9"
                />
                <text
                  x={toSvgX(scenarios[activeScenario].mean)}
                  y={padT + 8}
                  textAnchor="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="Titillium Web"
                >
                  {scenarios[activeScenario].mean}g
                </text>
              </motion.g>
            )}

            {/* Blended line */}
            {activeScenario === "blended" && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: isInView ? 1 : 0 }}
                transition={{ duration: 0.6 }}
              >
                <line
                  x1={toSvgX(blendedValue)}
                  y1={padT}
                  x2={toSvgX(blendedValue)}
                  y2={padT + plotH}
                  stroke={BLENDED_COLOR}
                  strokeWidth="2"
                  strokeDasharray="6 3"
                  opacity="0.8"
                />
                <rect
                  x={toSvgX(blendedValue) - 36}
                  y={padT - 10}
                  width="72"
                  height="24"
                  rx="4"
                  fill={BLENDED_COLOR}
                  opacity="0.95"
                />
                <text
                  x={toSvgX(blendedValue)}
                  y={padT + 8}
                  textAnchor="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="Titillium Web"
                >
                  {Math.round(blendedValue * 10) / 10}g
                </text>

                {/* Individual scenario mean markers */}
                {scenarios.map((s) => (
                  <g key={s.label}>
                    <line
                      x1={toSvgX(s.mean)}
                      y1={padT + plotH - 8}
                      x2={toSvgX(s.mean)}
                      y2={padT + plotH + 4}
                      stroke={s.color}
                      strokeWidth="2"
                      opacity="0.7"
                    />
                  </g>
                ))}
              </motion.g>
            )}
          </svg>
        </motion.div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 flex-wrap">
          {scenarios.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-xs text-cream/40">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-cream/40">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 rotate-45" />
            Blended
          </span>
        </div>

        {/* Model accuracy bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-6 flex items-center justify-center gap-4"
        >
          <span className="text-cream/40 text-sm">Model accuracy</span>
          <div className="w-40 h-2 bg-cream/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "95%" }}
              viewport={{ once: true }}
              transition={{ delay: 0.8, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{ backgroundColor: activeColor }}
            />
          </div>
          <span className="text-cream/60 text-sm font-semibold">95%</span>
        </motion.div>
      </div>
    </section>
  );
}
