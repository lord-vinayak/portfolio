"use client";

import { useEffect, useRef } from "react";
import {
  prepareWithSegments,
  layoutNextLineRange,
  materializeLineRange,
  type LayoutCursor,
} from "@chenglou/pretext";
import { getBob, subscribeBob } from "@/components/lamp/lamp-store";

/**
 * Layer 4 — text that flows around the live lamp bob as a moving obstacle.
 *
 * We render the prose to a <canvas> with @chenglou/pretext. pretext has no
 * built-in obstacle API, but it exposes per-line variable-width layout via
 * `layoutNextLineRange`, which is exactly how its "text around an orb" demos
 * work: for every line we compute the circle's horizontal chord at that line's
 * vertical band, carve it out, and lay the line into the widest free segment.
 *
 * This does zero DOM reflow — the paragraph height is fixed up front from a
 * full-width pass, and only the canvas pixels change as the bob moves.
 */

const FONT_SIZE = 14; // matches text-sm
const LINE_HEIGHT = 24;
const OBSTACLE_PAD = 14; // breathing room around the bob

export function PretextWrapper({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fontFamily =
      getComputedStyle(container).fontFamily || "Inter, sans-serif";
    const font = `${FONT_SIZE}px ${fontFamily}`;
    const prepared = prepareWithSegments(text, font);

    // cache the text color (a getComputedStyle read) and refresh it only when
    // the theme class on <html> flips, instead of every animation frame.
    let color = getComputedStyle(container).color;
    const themeObserver = new MutationObserver(() => {
      color = getComputedStyle(container).color;
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    let width = container.clientWidth;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    /** Full-width pass with no obstacle → fixed paragraph height. */
    const measureHeight = () => {
      let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
      let lines = 0;
      while (true) {
        const range = layoutNextLineRange(prepared, cursor, width);
        if (!range) break;
        lines++;
        if (
          range.end.segmentIndex === cursor.segmentIndex &&
          range.end.graphemeIndex === cursor.graphemeIndex
        )
          break; // safety: no progress
        cursor = range.end;
      }
      // one line of slack so the flow around the bob doesn't clip the last line
      return (lines + 1) * LINE_HEIGHT;
    };

    const resize = () => {
      width = container.clientWidth;
      height = measureHeight();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      container.style.height = `${height}px`;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    /**
     * Largest free horizontal segment on a line given the bob's chord.
     * cx/cy are the bob center already mapped into canvas-local coords, r is
     * the padded radius, and `on` is false when there's no obstacle at all.
     */
    const freeSegment = (
      lineTop: number,
      cx: number,
      cy: number,
      r: number,
      on: boolean
    ) => {
      const bandCenter = lineTop + LINE_HEIGHT / 2;
      const dy = Math.abs(cy - bandCenter);
      if (!on || dy >= r) return { x: 0, w: width }; // no overlap

      const half = Math.sqrt(r * r - dy * dy);
      const exL = Math.max(0, cx - half);
      const exR = Math.min(width, cx + half);
      if (exL <= 0 && exR >= width) return null; // fully covered → skip line
      if (exL <= 0) return { x: exR, w: width - exR }; // obstacle on the left
      if (exR >= width) return { x: 0, w: exL }; // obstacle on the right
      // obstacle in the middle → use the wider gap
      return exL >= width - exR
        ? { x: 0, w: exL }
        : { x: exR, w: width - exR };
    };

    let raf = 0;
    const render = () => {
      const bob = getBob();
      ctx.clearRect(0, 0, width, height);
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textBaseline = "alphabetic";

      // map the bob center into canvas-local coords once per frame
      const rect = canvas.getBoundingClientRect();
      const cx = bob.x - rect.left;
      const cy = bob.y - rect.top;
      const r = bob.r + OBSTACLE_PAD;
      const on = bob.r > 0;

      let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
      let y = 0;
      let guard = 0;
      while (y < height && guard++ < 1000) {
        const seg = freeSegment(y, cx, cy, r, on);
        if (seg === null) {
          y += LINE_HEIGHT; // line fully blocked by bob
          continue;
        }
        const range = layoutNextLineRange(prepared, cursor, seg.w);
        if (!range) break;
        const line = materializeLineRange(prepared, range);
        ctx.fillText(line.text, seg.x, y + FONT_SIZE);
        if (
          range.end.segmentIndex === cursor.segmentIndex &&
          range.end.graphemeIndex === cursor.graphemeIndex
        )
          break;
        cursor = range.end;
        y += LINE_HEIGHT;
      }
      raf = requestAnimationFrame(render);
    };
    render();

    const unsub = subscribeBob(() => {}); // keep store alive while mounted

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      themeObserver.disconnect();
      unsub();
    };
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="relative w-full font-sans text-sm text-muted-foreground"
    >
      <canvas ref={canvasRef} className="block" aria-hidden />
      {/* keep the real text in the DOM for SEO / a11y / copy-paste */}
      <span className="sr-only">{text}</span>
    </div>
  );
}
