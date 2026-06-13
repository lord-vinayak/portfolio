"use client";

import { useState, useEffect } from "react";
import { TextFlippingBoard } from "@/components/ui/text-flipping-board";

/**
 * Split-flap welcome loader.
 *
 * Timing is kept identical to the original `welcome-loader.tsx` so the rest of
 * the page's entrance animations (e.g. the Highlighter delays of 1085ms / 1900ms
 * in app/page.tsx) stay in sync:
 *
 *   HOLD_MS (900) + FADE_MS (530) + UNMOUNT_MS (100) = 1530ms total
 *
 * The board flips up the message during HOLD_MS, then the whole overlay fades
 * out over FADE_MS to reveal the portfolio beneath — mirroring the wave-wipe
 * reveal of the original loader.
 */
const HOLD_MS = 1900; // matches original SHOW_MS — board flips, then reveal begins
const FADE_MS = 530; // matches original WIPE_SPAN_MS + CELL_MS — the reveal/fade
const UNMOUNT_MS = 100; // tiny buffer before unmount (matches original)

// Welcome message rendered on the board (max 22 cols x 6 rows).
const MESSAGE = "WELCOME TO MY\nPORTFOLIO";

export function WelcomeLoaderFlip() {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fade"), HOLD_MS);
    const t2 = setTimeout(
      () => setPhase("gone"),
      HOLD_MS + FADE_MS + UNMOUNT_MS,
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  const fading = phase === "fade";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background px-6"
      style={{
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "auto",
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <TextFlippingBoard text={MESSAGE} duration={HOLD_MS / 1000} />
    </div>
  );
}
