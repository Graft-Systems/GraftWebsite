import { SceneHero } from "@/components/scenes/SceneHero";
import { SceneProblem } from "@/components/scenes/SceneProblem";
import { SceneTool } from "@/components/scenes/SceneTool";
import { SceneMap } from "@/components/scenes/SceneMap";
import { SceneProof } from "@/components/scenes/SceneProof";
import { SceneTarget } from "@/components/scenes/SceneTarget";
import { SceneApproach } from "@/components/scenes/SceneApproach";
import { SceneAsk } from "@/components/scenes/SceneAsk";

export default function HomePage() {
  return (
    <main className="relative">
      <SceneHero />
      <SceneProblem />
      <SceneTool />
      <SceneMap />
      <SceneProof />
      <SceneTarget />
      <SceneApproach />
      <SceneAsk />
    </main>
  );
}
