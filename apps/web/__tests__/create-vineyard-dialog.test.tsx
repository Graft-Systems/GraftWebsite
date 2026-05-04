/**
 * CreateVineyardDialog test (M0-05 step 7).
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { CreateVineyardDialog } from "@/components/spray/CreateVineyardDialog";

describe("CreateVineyardDialog", () => {
  it("submits name + region", async () => {
    const onSubmit = vi.fn(async () => {});
    const onClose = vi.fn();
    const { getByLabelText, getByRole } = render(
      <CreateVineyardDialog onClose={onClose} onSubmit={onSubmit} />
    );
    fireEvent.change(getByLabelText("Name"), {
      target: { value: "Klein Estate" },
    });
    fireEvent.change(getByLabelText("Region"), {
      target: { value: "sonoma" },
    });
    fireEvent.click(getByRole("button", { name: /create/i }));
    await Promise.resolve();
    await Promise.resolve();
    expect(onSubmit).toHaveBeenCalledWith("Klein Estate", "sonoma");
  });

  it("disables submit when name empty", () => {
    const { getByRole } = render(
      <CreateVineyardDialog
        onClose={() => {}}
        onSubmit={async () => {}}
      />
    );
    const submit = getByRole("button", { name: /create/i });
    expect(submit).toBeDisabled();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    const { getByRole } = render(
      <CreateVineyardDialog onClose={onClose} onSubmit={async () => {}} />
    );
    fireEvent.click(getByRole("dialog"));
    expect(onClose).toHaveBeenCalled();
  });
});
