import Link from "next/link";
import { WaitlistField } from "@/components/ui/WaitlistField";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative border-t border-border/40 bg-background">
      {/* Waitlist band */}
      <div className="border-b border-border/40">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-6 py-14 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-20 lg:px-10 lg:py-16">
          <div>
            <p className="frame text-[0.68rem] font-semibold text-sage">
              BE THERE AT LAUNCH
            </p>
            <h3 className="display mt-4 text-2xl leading-tight text-foreground lg:text-[1.75rem]">
              Watch the product take shape.
            </h3>
          </div>
          <WaitlistField
            source="footer"
            label="Join the waitlist"
            helper="A single email whenever we ship something meaningful. No marketing sequences."
          />
        </div>
      </div>

      {/* Link columns */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-6 py-14 lg:grid-cols-3 lg:px-10">
        <div>
          <Link
            href="/"
            className="frame text-base font-semibold text-foreground"
            aria-label="Graft home"
          >
            GRAFT SYSTEMS
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="frame mb-4 text-[0.65rem] text-foreground-muted">Site</p>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-foreground/80 hover:text-foreground">About</Link></li>
              <li><Link href="/news" className="text-foreground/80 hover:text-foreground">News</Link></li>
              <li><Link href="/tool" className="text-foreground/80 hover:text-foreground">Yield preview</Link></li>
              <li><Link href="/spray" className="text-foreground/80 hover:text-foreground">Spray</Link></li>
              <li><Link href="/contact" className="text-foreground/80 hover:text-foreground">Contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="frame mb-4 text-[0.65rem] text-foreground-muted">Contact</p>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:graftsystems@gmail.com"
                  className="text-foreground/80 hover:text-foreground"
                >
                  graftsystems@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="lg:text-right">
          <p className="frame text-[0.65rem] text-foreground-muted">
            © {year} Graft Systems
          </p>
          <p className="mt-2 text-[0.7rem] text-foreground-muted/70">
            Built for vignerons.
          </p>
        </div>
      </div>
    </footer>
  );
}
