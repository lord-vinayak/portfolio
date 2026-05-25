"use client";

import { useState, useEffect, useMemo } from "react";

const COLS = 14;
const ROWS = 8;
const SHOW_MS = 900;      // "Welcome." visible duration
const WIPE_SPAN_MS = 350; // spread of wave delays across all cells
const CELL_MS = 180;      // each cell's individual fade duration
const UNMOUNT_MS = 100;   // tiny buffer before unmount

export function WelcomeLoader() {
  const [phase, setPhase] = useState<"show" | "wipe" | "gone">("show");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("wipe"), SHOW_MS);
    const t2 = setTimeout(() => setPhase("gone"), SHOW_MS + WIPE_SPAN_MS + CELL_MS + UNMOUNT_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Normalize wave distances to delay values in ms
  const cellDelays = useMemo(() => {
    const raw: number[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        raw.push(Math.hypot(x - (COLS - 1) / 2, y - (ROWS - 1) / 2));
      }
    }
    const max = Math.max(...raw);
    return raw.map((d) => (d / max) * WIPE_SPAN_MS);
  }, []);

  if (phase === "gone") return null;

  const wiping = phase === "wipe";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: wiping ? "none" : "auto",
      }}
    >
      {/* Grid cells — sit beneath the text, provide the black background.
          Each cell fades to transparent on wave pattern, revealing the portfolio. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          zIndex: 1,
        }}
      >
        {cellDelays.map((delay, i) => (
          <div
            key={i}
            style={{
              background: "#000",
              opacity: wiping ? 0 : 1,
              transition: wiping
                ? `opacity ${CELL_MS}ms ease ${delay}ms`
                : "none",
            }}
          />
        ))}
      </div>

      {/* "Welcome." text — layered above cells, fades out as wipe begins */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: "clamp(2.5rem, 8vw, 6rem)",
          fontWeight: 700,
          letterSpacing: "-0.04em",
          opacity: wiping ? 0 : 1,
          transition: "opacity 0.12s ease",
          pointerEvents: "none",
        }}
      >
        Welcome.
      </div>
    </div>
  );
}
