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
    getLayer() {
      return {};
    }
    setPaintProperty() {}
    getCanvas() {
      return { style: {} };
    }
    unproject() {
      return { toArray: () => [0, 0] };
    }
    project() {
      return { x: 0, y: 0 };
    }
    dragPan = { disable() {}, enable() {} };
    scrollZoom = { disable() {}, enable() {} };
    touchZoomRotate = { disable() {}, enable() {} };
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

  it("shows extend toolbar when extendBlockId + onBlockExtend are set", () => {
    const onExtend = vi.fn();
    const { getByText } = render(
      <SprayMap
        centroid={null}
        blocks={[]}
        selectedBlockId="blk-1"
        editable={false}
        extendBlockId="blk-1"
        onBlockExtend={onExtend}
        onBlockSelect={() => {}}
        onBlockCreate={() => {}}
        onBlockUpdate={() => {}}
      />
    );
    expect(getByText("Add to block footprint")).toBeInTheDocument();
  });
});