"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
const graftLogoWhite = "/attached_assets/graft-logo-white-navbar.png";

export default function TryToolSection() {
  const router = useRouter();
  return (
    <section id="try-tool" className="bg-vineyard-earth relative py-24 lg:py-32">
      {/* Subtle top divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-cream/5" />

      <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Decorative grape cluster */}
          <div className="flex justify-center mb-8">
            <svg width="48" height="60" viewBox="0 0 48 60" fill="none">
              {/* Stem */}
              <path d="M 24 0 C 24 8, 22 12, 24 18" stroke="#6B8F44" strokeWidth="2" strokeLinecap="round" />
              {/* Leaf */}
              <path
                d="M 24 10 C 30 4, 38 6, 36 14 C 34 20, 28 16, 24 10Z"
                fill="#5A8A3A"
                opacity="0.7"
              />
              {/* Grapes */}
              <circle cx="18" cy="26" r="6" fill="#8B2332" opacity="0.9" />
              <circle cx="30" cy="26" r="6" fill="#8B2332" opacity="0.9" />
              <circle cx="24" cy="26" r="6" fill="#A52D3F" opacity="0.85" />
              <circle cx="14" cy="36" r="5.5" fill="#8B2332" opacity="0.85" />
              <circle cx="24" cy="36" r="5.5" fill="#8B2332" opacity="0.85" />
              <circle cx="34" cy="36" r="5.5" fill="#8B2332" opacity="0.85" />
              <circle cx="19" cy="45" r="5" fill="#6B1A26" opacity="0.8" />
              <circle cx="29" cy="45" r="5" fill="#6B1A26" opacity="0.8" />
              <circle cx="24" cy="53" r="4.5" fill="#6B1A26" opacity="0.75" />
              {/* Highlights */}
              <circle cx="17" cy="24.5" r="1.5" fill="white" opacity="0.15" />
              <circle cx="29" cy="24.5" r="1.5" fill="white" opacity="0.15" />
            </svg>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-cream mb-5">
            Ready to Estimate Your Yield?
          </h2>
          <p className="text-cream/60 text-lg max-w-xl mx-auto mb-10">
            Upload a photo of your grape clusters and get an estimate in seconds.
            No account needed.
          </p>

          <button
            onClick={() => {
              router.push("/tool");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="bg-brand-burgundy text-white font-semibold px-10 py-4 rounded-md text-lg
                       hover:bg-brand-burgundy-light transition-all duration-200
                       hover:scale-[1.02] active:scale-[0.98]"
            data-testid="button-try-tool-cta"
          >
            Try the Tool
          </button>

          <p className="text-cream/30 text-xs mt-6">
            Free during beta. No sign-up required.
          </p>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto px-6 lg:px-8 mt-24 pt-8 border-t border-cream/8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={graftLogoWhite} alt="Graft Systems" className="w-7 h-7 object-contain" />
            <span className="text-cream/40 text-sm">Graft Systems</span>
          </div>
          <div className="flex items-center gap-6 text-cream/30 text-sm">
            <a href="mailto:graftsystems@gmail.com" className="hover:text-cream/50 transition-colors"
               target="_blank" rel="noopener noreferrer">
              graftsystems@gmail.com
            </a>
          </div>
          <span className="text-cream/20 text-xs">
            &copy; {new Date().getFullYear()} Graft Systems
          </span>
        </div>
      </div>
    </section>
  );
}
