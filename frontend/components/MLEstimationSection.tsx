"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
const clusterImg = "/attached_assets/chardonnay-cluster.png";

const WEIGHT_POINTS = [
  { x: 30, y: 18, weight: "3.8g", delay: 0.5 },
  { x: 15, y: 32, weight: "4.2g", delay: 0.8 },
  { x: 48, y: 30, weight: "4.5g", delay: 1.1 },
  { x: 22, y: 48, weight: "3.1g", delay: 1.4 },
  { x: 32, y: 60, weight: "4.0g", delay: 1.7 },
];

export default function MLEstimationSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 });
  const [scanActive, setScanActive] = useState(false);
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    if (isInView) {
      setScanActive(true);
      setScanCount((c) => c + 1);
    } else {
      setScanActive(false);
    }
  }, [isInView]);

  return (
    <section
      id="ml-estimation"
      ref={sectionRef}
      className="bg-vineyard-earth relative py-24 lg:py-32"
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Section title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-cream mb-4">
            Machine Learning Estimation
          </h2>
          <p className="text-cream/70 text-lg max-w-2xl mx-auto">
            Our models analyze every grape in the cluster — trained on PhD research databases
            and thousands of real vine images.
          </p>
        </motion.div>

        {/* Grape analysis visual */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Grape image with scanner and weight circles */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative w-full max-w-sm aspect-[3/4] flex-shrink-0"
          >
            {/* Grape cluster image */}
            <img
              src={clusterImg}
              alt="Chardonnay grape cluster being analyzed"
              className="w-full h-full object-contain relative z-10"
            />

            {/* Scan line */}
            {scanActive && (
              <div
                key={`scan-${scanCount}`}
                className="absolute left-0 right-0 h-0.5 z-20"
                style={{
                  background: "linear-gradient(90deg, transparent, #3B82F6, #60A5FA, #3B82F6, transparent)",
                  boxShadow: "0 0 20px 4px rgba(59, 130, 246, 0.4)",
                  animation: "scanLine 3s ease-in-out infinite",
                  animationDelay: "0.5s",
                  top: "0%",
                }}
              />
            )}

            {/* ID tag */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute top-4 left-4 z-30 bg-vineyard-brown/80 backdrop-blur-sm
                         border border-cream/20 rounded-md px-3 py-1.5"
            >
              <span className="text-cream/80 text-xs font-semibold tracking-wider">
                Chardonnay: Clone 76
              </span>
            </motion.div>

            {/* Weight data points */}
            {WEIGHT_POINTS.map((point, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: point.delay, duration: 0.4, type: "spring", damping: 15 }}
                className="absolute z-20"
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                {/* Outer pulse ring */}
                <div className="absolute -inset-2 rounded-full border border-blue-400/40 weight-circle" />
                {/* Inner circle */}
                <div className="w-5 h-5 rounded-full bg-blue-500/30 border border-blue-400/80
                               flex items-center justify-center backdrop-blur-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                </div>
                {/* Weight label */}
                <div className="absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap
                               bg-vineyard-brown/70 backdrop-blur-sm rounded px-2 py-0.5
                               border border-blue-400/30">
                  <span className="text-blue-300 text-xs font-semibold">{point.weight}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-1"
          >
            <h3 className="text-2xl font-semibold text-cream mb-6">
              Every grape, measured
            </h3>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-brand-burgundy/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5F0E8" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-cream font-semibold mb-1">Photo capture</h4>
                  <p className="text-cream/60 text-sm leading-relaxed">
                    Snap a photo of any grape cluster in your vineyard. Our models work with standard smartphone cameras — no special equipment needed.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-brand-burgundy/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5F0E8" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-cream font-semibold mb-1">Research-backed models</h4>
                  <p className="text-cream/60 text-sm leading-relaxed">
                    Trained on PhD research databases and real vine imagery from vineyards across growing regions. The same data researchers trust.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-brand-burgundy/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5F0E8" strokeWidth="2">
                    <path d="M12 20V10M18 20V4M6 20v-4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-cream font-semibold mb-1">Precise estimation</h4>
                  <p className="text-cream/60 text-sm leading-relaxed">
                    Get weight estimates for individual clusters, blocks, or entire vineyards. The model provides a confidence range so you know exactly where you stand.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
