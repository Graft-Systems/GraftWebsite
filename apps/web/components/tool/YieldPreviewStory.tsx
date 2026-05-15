import { SceneMap } from "@/components/scenes/SceneMap";
import { SceneProof } from "@/components/scenes/SceneProof";
import { SceneTool } from "@/components/scenes/SceneTool";

/** Yield-estimation marketing sections on the preview page. */
export function YieldPreviewStory() {
  return (
    <>
      <SceneTool variant="yield" />
      <SceneProof variant="yield" />
      <SceneMap variant="yield" />
    </>
  );
}
