"use client";

import { ToolBasic } from "@/components/tool/ToolBasic";

export default function ToolPage() {
  return (
    <main className="relative min-h-dvh bg-background pt-28">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="pb-20">
          <ToolBasic />
        </div>
      </div>
    </main>
  );
}
