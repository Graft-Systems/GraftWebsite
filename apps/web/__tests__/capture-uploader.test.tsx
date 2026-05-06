/**
 * CaptureUploader test (M1-09).
 *
 * Mounts the component, drops a fake file, asserts the init->put->finalize
 * fetch sequence fires.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: async () => "test-token" }),
}));

import { CaptureUploader } from "@/components/spray/CaptureUploader";

class FakeXHR {
  static instances: FakeXHR[] = [];
  upload = { addEventListener: vi.fn() };
  status = 204;
  open = vi.fn();
  send = vi.fn();
  addEventListener = vi.fn((event: string, cb: () => void) => {
    if (event === "load") setTimeout(cb, 0);
  });
  constructor() {
    FakeXHR.instances.push(this);
  }
}

describe("CaptureUploader", () => {
  beforeEach(() => {
    FakeXHR.instances = [];
    // @ts-expect-error - test stub
    globalThis.XMLHttpRequest = FakeXHR;
  });

  it("fires init -> S3 PUT -> finalize for a file pick", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("/captures/init")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              capture: { id: "cap-1", status: "pending" },
              upload: { url: "https://s3/bucket", fields: { key: "x" } },
            }),
            { status: 201, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      if (url.endsWith("/finalize")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "cap-1",
              block_id: "block-1",
              kind: "photo",
              status: "uploaded",
              download_url: "https://s3/signed",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      return Promise.reject(new Error(`unexpected url: ${url}`));
    });
    // @ts-expect-error - test stub
    globalThis.fetch = fetchMock;

    const onUploaded = vi.fn();
    const { container } = render(
      <CaptureUploader
        orgId="org-1"
        blockId="block-1"
        onCaptureUploaded={onUploaded}
      />
    );

    const input = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    const file = new File(["x"], "leaf.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(
      () => {
        expect(onUploaded).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 }
    );

    const initCall = fetchMock.mock.calls.find(([u]: [string]) =>
      String(u).endsWith("/captures/init")
    );
    expect(initCall).toBeDefined();

    const finalizeCall = fetchMock.mock.calls.find(([u]: [string]) =>
      String(u).endsWith("/finalize")
    );
    expect(finalizeCall).toBeDefined();

    expect(FakeXHR.instances.length).toBe(1);
    expect(FakeXHR.instances[0].open).toHaveBeenCalledWith(
      "POST",
      "https://s3/bucket"
    );
  });
});
