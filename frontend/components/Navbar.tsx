"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
const graftLogo = "/attached_assets/graft-logo-navbar.png";
const graftLogoWhite = "/attached_assets/graft-logo-white-navbar.png";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isAboutPage = pathname === "/about";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);

    if (href === "#") {
      // Home link
      if (pathname !== "/") {
        router.push("/");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (href === "/about" || href === "/contact" || href === "/tool") {
      // Navigate to page
      router.push(href);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (href.startsWith("#")) {
      // Section links — if not on home page, go home first
      if (pathname !== "/") {
        router.push("/");
        // After navigation, scroll to section
        setTimeout(() => {
          document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const navLinks = [
    { label: "Home", href: "#" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "navbar-scrolled"
          : "navbar-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Logo */}
          <button
            onClick={() => handleNavClick("#")}
            className="flex items-center gap-3"
          >
            <img
              src={scrolled ? graftLogo : graftLogoWhite}
              alt="Graft Systems logo"
              className="w-9 h-9 object-contain transition-opacity duration-300"
            />
            <span
              className={`text-lg font-semibold tracking-tight transition-colors duration-300 ${
                scrolled ? "text-vineyard-earth" : "text-white"
              }`}
            >
              Graft Systems
            </span>
          </button>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className={`text-sm font-semibold transition-colors duration-200 hover:opacity-80 ${
                  scrolled ? "text-vineyard-earth" : "text-white"
                } ${
                  (link.href === "/about" && pathname === "/about") || (link.href === "/contact" && pathname === "/contact")
                    ? "opacity-100 underline underline-offset-4"
                    : ""
                }`}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => {}}
              className="text-sm font-semibold transition-colors duration-200 hover:opacity-80"
              style={{ color: scrolled ? '#2C1810' : 'white' }}
            >
              Sign In
            </button>
            <button
              onClick={() => handleNavClick("/tool")}
              className="bg-brand-burgundy text-white text-sm font-semibold px-5 py-2 rounded-md
                         hover:bg-brand-burgundy-light transition-colors duration-200"
            >
              Try the Tool
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`md:hidden p-2 transition-colors ${
              scrolled ? "text-vineyard-earth" : "text-white"
            }`}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white rounded-lg shadow-lg p-4 mb-4"
          >
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="block w-full text-left px-4 py-3 text-vineyard-earth font-semibold
                           hover:bg-gray-50 rounded"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => handleNavClick("/tool")}
              className="w-full mt-2 bg-brand-burgundy text-white font-semibold px-5 py-3 rounded-md"
            >
              Try the Tool
            </button>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}
