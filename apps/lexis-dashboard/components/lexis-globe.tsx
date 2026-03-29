"use client";

import dynamic from "next/dynamic";
import type { GlobePin } from "./lexis-globe-inner";

const Inner = dynamic(() => import("./lexis-globe-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(72vh,640px)] w-full animate-pulse items-center justify-center rounded-xl bg-zinc-900 text-sm text-zinc-400">
      Loading globe…
    </div>
  ),
});

export type { GlobePin };

export function LexisGlobe({ pins }: { pins: GlobePin[] }) {
  return <Inner pins={pins} />;
}
