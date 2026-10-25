import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Runs one write at a time. A second call while the first is still running
 * is dropped. The check is a ref, not state, so it holds even before React
 * re-renders the disabled button: a double-click, a double tap or Enter
 * pressed twice sends one request. A failure becomes a toast.
 */
export function useAction() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (job: () => Promise<unknown>, failure = "Something went wrong") => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await job();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : failure);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, run };
}
