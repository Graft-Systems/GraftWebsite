import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact — Graft Systems",
  description: "Talk to the team.",
};

export default function ContactPage() {
  return (
    <main className="relative min-h-dvh bg-background pt-32 pb-24">
      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-16 px-6 lg:grid-cols-[1fr_1.2fr] lg:gap-24 lg:px-10 lg:pt-12">
        <div>
          <span className="frame text-[0.72rem] font-semibold text-sage">
            CONTACT
          </span>
          <h1 className="display mt-5 text-display-lg text-foreground">
            Let&apos;s talk.
          </h1>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-foreground/75 sm:text-lg">
            Drop us a line — whether you&apos;re a grower, a partner, or
            somewhere in between. We reply to every message.
          </p>

          <dl className="mt-12 space-y-6 text-sm">
            <div>
              <dt className="frame text-[0.6rem] text-foreground-muted">EMAIL</dt>
              <dd className="mt-2">
                <a
                  href="mailto:graftsystems@gmail.com"
                  className="text-foreground transition-colors hover:text-amber"
                >
                  graftsystems@gmail.com
                </a>
              </dd>
            </div>
            <div>
              <dt className="frame text-[0.6rem] text-foreground-muted">
                RESPONSE
              </dt>
              <dd className="mt-2 text-foreground/75">Within 24 hours.</dd>
            </div>
          </dl>
        </div>

        <ContactForm />
      </div>
    </main>
  );
}
