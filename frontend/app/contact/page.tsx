"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import VineTracker from "@/components/VineTracker";
const contactHero = "/attached_assets/contact-hero.jpg";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    winery: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to send message.");
      }
      setSubmitted(true);
      setFormData({ name: "", email: "", winery: "", message: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <VineTracker />

      {/* Hero */}
      <section className="relative h-[50vh] lg:h-[55vh] overflow-hidden">
        <img
          src={contactHero}
          alt="Vineyard landscape"
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
            Get In Touch
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-white/70 text-lg mt-4 max-w-xl"
          >
            Whether you're a winemaker, grower, or just curious — we'd love to hear from you.
          </motion.p>
        </div>
      </section>

      {/* Contact content */}
      <section className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left: Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl lg:text-3xl font-semibold text-vineyard-earth mb-6">
                Let's talk
              </h2>
              <p className="text-vineyard-earth/70 leading-relaxed mb-8">
                Have questions about how Graft Systems can help your vineyard?
                Want to explore a partnership or pilot program? Drop us a line —
                we respond to every message.
              </p>

              <div className="space-y-6">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-burgundy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#8B2332"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M22 7l-10 7L2 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-vineyard-earth mb-1">
                      Email
                    </p>
                    <a
                      href="mailto:graftsystems@gmail.com"
                      className="text-brand-burgundy hover:underline"
                    >
                      graftsystems@gmail.com
                    </a>
                  </div>
                </div>

                {/* Response time */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-burgundy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#8B2332"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-vineyard-earth mb-1">
                      Response time
                    </p>
                    <p className="text-vineyard-earth/60">
                      We typically reply within 24 hours.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right: Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {submitted ? (
                <div className="bg-white rounded-xl border border-vineyard-earth/10 p-8 lg:p-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-vineyard-earth mb-2">
                    Message sent
                  </h3>
                  <p className="text-vineyard-earth/60">
                    Thanks for reaching out. We'll get back to you soon.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="bg-white rounded-xl border border-vineyard-earth/10 p-8 lg:p-10 space-y-5"
                >
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-semibold text-vineyard-earth mb-1.5"
                    >
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-vineyard-earth/20 bg-cream/50
                                 text-vineyard-earth placeholder-vineyard-earth/30
                                 focus:outline-none focus:ring-2 focus:ring-brand-burgundy/30 focus:border-brand-burgundy
                                 transition-colors"
                      placeholder="Your name"
                      data-testid="input-name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-vineyard-earth mb-1.5"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-vineyard-earth/20 bg-cream/50
                                 text-vineyard-earth placeholder-vineyard-earth/30
                                 focus:outline-none focus:ring-2 focus:ring-brand-burgundy/30 focus:border-brand-burgundy
                                 transition-colors"
                      placeholder="you@example.com"
                      data-testid="input-email"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="winery"
                      className="block text-sm font-semibold text-vineyard-earth mb-1.5"
                    >
                      Winery / Vineyard{" "}
                      <span className="text-vineyard-earth/40 font-normal">
                        (optional)
                      </span>
                    </label>
                    <input
                      id="winery"
                      name="winery"
                      type="text"
                      value={formData.winery}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-vineyard-earth/20 bg-cream/50
                                 text-vineyard-earth placeholder-vineyard-earth/30
                                 focus:outline-none focus:ring-2 focus:ring-brand-burgundy/30 focus:border-brand-burgundy
                                 transition-colors"
                      placeholder="Your winery or vineyard name"
                      data-testid="input-winery"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-semibold text-vineyard-earth mb-1.5"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-vineyard-earth/20 bg-cream/50
                                 text-vineyard-earth placeholder-vineyard-earth/30
                                 focus:outline-none focus:ring-2 focus:ring-brand-burgundy/30 focus:border-brand-burgundy
                                 transition-colors resize-none"
                      placeholder="Tell us what you're working on..."
                      data-testid="input-message"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-brand-burgundy text-white font-semibold py-3 rounded-lg
                               hover:bg-brand-burgundy-light transition-colors duration-200
                               disabled:opacity-60 disabled:cursor-not-allowed"
                    data-testid="button-submit-contact"
                  >
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-vineyard-earth py-8">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-cream/40 text-sm">
            &copy; {new Date().getFullYear()} Graft Systems. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
