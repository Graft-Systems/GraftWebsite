/**
 * SprayMap test (M0-05 step 7).
 *
 * jsdom can't render WebGL, so we mock maplibre-gl wholesale and just
 * verify the component mounts a container and forwards lifecycle.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("maplibre-gl", () => {
  class FakeMap {
    on() {}
    addSource() {}
    addLayer() {}
    addControl() {}
    removeControl() {}
    queryRenderedFeatures() {
      return [];
    }
    flyTo() {}
    getSource() {
      return { setData() {} };
    }
    remove() {}
  }
  return {
    default: { Map: FakeMap },
    Map: FakeMap,
  };
});

// CSS imports inside the component need stubbing so Vite doesn't choke.
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

import { SprayMap } from "@/components/spray/SprayMap";

describe("SprayMap", () => {
  it("renders a map container", () => {
    const { getByTestId } = render(
      <SprayMap
        centroid={null}
        blocks={[]}
        selectedBlockId={null}
        editable={false}
        onBlockSelect={() => {}}
        onBlockCreate={() => {}}
        onBlockUpdate={() => {}}
      />
    );
    expect(getByTestId("spray-map")).toBeInTheDocument();
  });
});
