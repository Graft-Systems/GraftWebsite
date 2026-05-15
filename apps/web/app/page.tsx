import { SceneHero } from "@/components/scenes/SceneHero";
// import { SceneProblem } from "@/components/scenes/SceneProblem"; // parked
import { ScenePillars } from "@/components/scenes/ScenePillars";
// Home-page scroll scenes (Seconds per cluster, map drill-down, yield proof,
// engineering goal, approach) — parked for a possible move or removal.
// import { SceneTool } from "@/components/scenes/SceneTool";
// import { SceneMap } from "@/components/scenes/SceneMap";
// import { SceneProof } from "@/components/scenes/SceneProof";
// import { SceneTarget } from "@/components/scenes/SceneTarget";
// import { SceneApproach } from "@/components/scenes/SceneApproach";
import { SceneAsk } from "@/components/scenes/SceneAsk";

export default function HomePage() {
  return (
    <main className="relative">
      <SceneHero />
      {/* <SceneProblem /> */}
      <ScenePillars />
      {/* <SceneTool /> */}
      {/* <SceneMap /> */}
      {/* <SceneProof /> */}
      {/* <SceneTarget /> */}
      {/* <SceneApproach /> */}
      <SceneAsk />
    </main>
  );
}
