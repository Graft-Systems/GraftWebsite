"use client";

import {
  ToolPageProvider,
  ToolPredictionsSection,
  ToolUploadSection,
} from "@/components/tool/ToolBasic";
import { YieldPreviewStory } from "@/components/tool/YieldPreviewStory";

export default function ToolPage() {
  return (
    <ToolPageProvider>
      <main className="relative bg-background">
        <YieldPreviewStory />
        <div className="mx-auto max-w-[1400px] space-y-0 px-6 pb-28 pt-8 lg:px-10">
          <ToolUploadSection />
          <ToolPredictionsSection />
        </div>
      </main>
    </ToolPageProvider>
  );
}
