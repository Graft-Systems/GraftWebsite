import { SceneMap } from "@/components/scenes/SceneMap";
import { SceneProof } from "@/components/scenes/SceneProof";
import { SceneTool } from "@/components/scenes/SceneTool";
import { YieldPreviewHero } from "@/components/tool/YieldPreviewHero";

/** Yield-estimation marketing sections on the preview page. */
export function YieldPreviewStory() {
  return (
    <>
      <YieldPreviewHero />
      <SceneTool variant="yield" />
      <SceneProof variant="yield" />
      <SceneMap variant="yield" />
    </>
  );
}
