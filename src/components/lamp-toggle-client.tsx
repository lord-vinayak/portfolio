"use client";

import dynamic from "next/dynamic";

const LampToggle = dynamic(
  () => import("@/components/lamp-toggle").then((m) => m.LampToggle),
  { ssr: false }
);

export function LampToggleClient() {
  return <LampToggle />;
}
