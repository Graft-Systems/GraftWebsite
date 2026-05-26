import Image from "next/image";

import { cn } from "@/lib/admin/utils";

/** Full wordmark: server/vine icon + “Graft Systems” (typically on white / light). */
const WORDMARK_SRC = "/brand/graft-systems-wordmark.png";
const WORDMARK_WIDTH = 1024;
const WORDMARK_HEIGHT = 194;

/** Server + vine mark only—compact spots. */
const MARK_SRC = "/brand/graft-mark.png";
const MARK_WIDTH = 164;
const MARK_HEIGHT = 190;

type GraftLogoProps = {
  className?: string;
  /** Sidebar / navy — wordmark + CRM in one cream badge. */
  onDark?: boolean;
};

export function GraftLogo({ className, onDark }: GraftLogoProps) {
  if (onDark) {
    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-2.5 rounded-2xl px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] ring-1 ring-black/[0.07]",
          "bg-[var(--graft-cream)]",
          className,
        )}
      >
        <Image
          src={WORDMARK_SRC}
          alt="Graft Systems"
          width={WORDMARK_WIDTH}
          height={WORDMARK_HEIGHT}
          sizes="220px"
          priority
          className="h-7 w-auto max-w-[min(11rem,calc(100%-3rem))] shrink object-contain object-left sm:h-8"
        />
        <span
          aria-hidden
          className="h-4.5 w-px shrink-0 self-center bg-primary/30 sm:h-6"
        />
        <span className="shrink-0 pt-px text-[0.8125rem] font-semibold tracking-wider text-primary leading-none sm:text-[0.875rem]">
          CRM
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 sm:gap-2.5",
        className,
      )}
    >
      <Image
        src={WORDMARK_SRC}
        alt="Graft Systems"
        width={WORDMARK_WIDTH}
        height={WORDMARK_HEIGHT}
        sizes="(max-width: 640px) 72vw, 280px"
        priority
        className="h-9 w-auto max-w-[min(16rem,calc(100%-3.25rem))] shrink object-contain object-left sm:h-10"
      />
      <span
        aria-hidden
        className="h-6 w-px shrink-0 bg-primary/20 sm:h-7"
      />
      <span className="shrink-0 pt-px text-[0.9375rem] font-semibold tracking-[0.03em] text-primary leading-none sm:text-base">
        CRM
      </span>
    </div>
  );
}

type GraftMarkProps = {
  className?: string;
};

/** Stand-alone mark for compact UI (favicons, chips, etc.). */
export function GraftMark({ className }: GraftMarkProps) {
  return (
    <Image
      src={MARK_SRC}
      alt="Graft"
      width={MARK_WIDTH}
      height={MARK_HEIGHT}
      className={cn("object-contain", className)}
    />
  );
}
