"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/spray", label: "Spray" },
  { href: "/tool", label: "Yield Preview" },
  { href: "/about", label: "About" },
  { href: "/news", label: "News" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const threshold = window.innerHeight * 0.8;
        const delta = y - lastY;

        setScrolled(y > threshold);

        if (y < threshold) {
          setVisible(true);
        } else if (delta > 4) {
          setVisible(false);
        } else if (delta < -4) {
          setVisible(true);
        }

        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[transform,background-color,border-color,backdrop-filter] duration-300 ease-out",
        visible ? "translate-y-0" : "-translate-y-full",
        scrolled
          ? "bg-background/85 backdrop-blur-md border-b border-border/40"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-10">
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 text-foreground transition-colors hover:text-amber"
          aria-label="Graft home"
        >
          <Image
            src="/brand/graft-mark.png"
            alt=""
            width={96}
            height={24}
            aria-hidden
            draggable={false}
            className="h-6 w-auto transition-opacity group-hover:opacity-90"
            priority
          />
          <span className="frame text-[0.95rem] font-semibold">GRAFT SYSTEMS</span>
        </Link>

        <ul className="flex items-center gap-8">
          {LINKS.slice(1).map((link) => {
            // Logged-in users deep-link straight into the Spray app shell.
            const href =
              link.href === "/spray" && isLoaded && isSignedIn
                ? "/spray/dashboard"
                : link.href;
            return (
              <li key={link.href}>
                <Link
                  href={href}
                  className="frame inline-flex items-center text-[0.7rem] font-semibold leading-none text-foreground/80 transition-colors hover:text-amber"
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
          <li className="flex items-center">
            {isLoaded && isSignedIn ? (
              <UserButton
                appearance={{ variables: { colorPrimary: "#c08a3e" } }}
                userProfileMode="modal"
              />
            ) : (
              <Link
                href="/sign-in"
                className="frame inline-flex items-center text-[0.7rem] font-semibold leading-none text-foreground/80 transition-colors hover:text-amber"
              >
                Log in
              </Link>
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
}
