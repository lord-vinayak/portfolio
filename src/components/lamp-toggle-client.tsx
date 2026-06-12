"use client";

import dynamic from "next/dynamic";

// ssr:false — matter-js and the canvas need window/document.
const InteractiveLamp = dynamic(
  () =>
    import("@/components/interactive-lamp").then((m) => m.InteractiveLamp),
  { ssr: false }
);

export function LampToggleClient() {
  return <InteractiveLamp />;
}
