import { useRef, useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResponsiveFormPanel } from "./responsive-form-panel";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

afterEach(cleanup);

function Harness() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(true)}>Add task</button>
      <ResponsiveFormPanel
        open={open}
        onOpenChange={setOpen}
        returnFocusRef={triggerRef}
        title="Add new task"
      >
        <button onClick={() => setOpen(false)}>Cancel</button>
        <button onClick={() => setOpen(false)}>Save</button>
      </ResponsiveFormPanel>
    </>
  );
}

describe("ResponsiveFormPanel focus restoration", () => {
  it.each(["Cancel", "Save"])("returns focus after %s closes the panel", async (label) => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Add task" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: label }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("returns focus after Escape closes the panel", async () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Add task" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
