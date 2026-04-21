"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
const heroImg = "/attached_assets/frenchvineyard.jpg";

export default function HeroSection() {
  const router = useRouter();
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImg})` }}
      />
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />
      
      {/* Bottom gradient that transitions into vineyard earth */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#2C1810] to-transparent" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold text-white leading-tight mb-6"
        >
          Know Your Yield{" "}
          <br className="hidden sm:block" />
          Before the Harvest
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-10 font-normal"
        >
          Graft Systems uses AI to estimate grape cluster weight from photos.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => {
              router.push("/tool");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="bg-brand-burgundy text-white font-semibold px-8 py-3 rounded-md text-base
                       hover:bg-brand-burgundy-light transition-colors duration-200 min-w-[180px]"
            data-testid="button-try-tool"
          >
            Try the Tool
          </button>
          <button
            onClick={() => {
              document.getElementById("ml-estimation")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="border-2 border-white/80 text-white font-semibold px-8 py-3 rounded-md text-base
                       hover:bg-white/10 transition-colors duration-200 min-w-[180px]"
            data-testid="button-learn-more"
          >
            Learn More
          </button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
            <path d="M12 5v14" />
            <path d="M19 12l-7 7-7-7" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
