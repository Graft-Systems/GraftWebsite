"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
const gamayGrapes = "/attached_assets/gamay-grapes-portrait.jpg";

// Original image aspect ratio: 450x600 = 3:4
const IMG_ASPECT = 3 / 4;

export default function SnapPhotoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.5 });
  const [flashKey, setFlashKey] = useState(0);
  const [isSharp, setIsSharp] = useState(false);
  const [textHeight, setTextHeight] = useState<number | null>(null);

  // Observe text block height with ResizeObserver
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      if (h > 50) setTextHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (isInView) {
      setIsSharp(false);
      const timer = setTimeout(() => {
        setFlashKey((k) => k + 1);
        setTimeout(() => {
          setIsSharp(true);
        }, 300);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setIsSharp(false);
    }
  }, [isInView]);

  // Height matches text block; width derives from the 3:4 aspect ratio
  const imgHeight = textHeight && textHeight > 100 ? textHeight : 240;
  const imgWidth = Math.round(imgHeight * IMG_ASPECT);

  return (
    <section
      ref={sectionRef}
      className="relative bg-vineyard-earth py-8 md:py-10 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center justify-center">
          {/* Left: Portrait grape cluster image — height matched to text */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex-shrink-0 rounded-lg overflow-hidden border-0"
            style={{
              width: imgWidth,
              height: imgHeight,
              minWidth: imgWidth,
              borderColor: "transparent",
            }}
          >
            {/* Camera flash overlay */}
            <div
              key={flashKey}
              className={`absolute inset-0 z-20 pointer-events-none ${
                flashKey > 0 ? "camera-flash" : "opacity-0"
              }`}
              style={{ backgroundColor: "white" }}
            />

            {/* Background image */}
            <div
              className={`w-full h-full transition-all duration-700 ${
                isSharp
                  ? "blur-0 brightness-100 scale-100"
                  : "blur-[2px] brightness-90 scale-105"
              }`}
              style={{
                backgroundImage: `url(${gamayGrapes})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              role="img"
              aria-label="Gamay wine grapes on the vine"
            />

            {/* Viewfinder corner brackets */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-white/80 z-10" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-white/80 z-10" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-white/80 z-10" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-white/80 z-10" />
          </motion.div>

          {/* Right: Text content */}
          <motion.div
            ref={textRef}
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="md:max-w-lg"
          >
            <h2 className="text-4xl md:text-5xl font-semibold text-white leading-tight mb-6">
              Snap a photo.
              <br />
              That's all it takes.
            </h2>
            <p className="text-lg text-white/70 leading-relaxed">
              Walk your vineyard and photograph a cluster. The image "clicks" and
              sharpens — our model takes it from there. No lab, no scale, no
              waiting.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
