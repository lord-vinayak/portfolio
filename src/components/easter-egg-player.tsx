"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animate, AnimatePresence, motion, useMotionValue } from "framer-motion";
import { X, Volume2, Volume1 } from "lucide-react";
import { Widget, WidgetContent, WidgetFooter } from "@/components/ui/widget";
import {
  AudioPlayerButton,
  AudioPlayerProvider,
  useAudioPlayer,
} from "@/components/ui/audio-player";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NIT_TRACK = {
  id: "nit-easter-egg",
  src: "/audio/HHarry Styles - Sign of the Times.mp3",
  data: {
    title: "Sign of the Times",
    artist: "Harry Styles",
    coverUrl: "/phm.jpg",
  },
};

const START_AT = 95;
const GAP = 24; // px from screen edge when snapped
const SPRING = { type: "spring", stiffness: 400, damping: 35 } as const;

function AutoPlay() {
  const { play, ref } = useAudioPlayer();
  useEffect(() => {
    const audio = ref.current;
    if (START_AT > 0 && audio) {
      const onReady = () => {
        audio.currentTime = START_AT;
        audio.removeEventListener("loadedmetadata", onReady);
      };
      audio.addEventListener("loadedmetadata", onReady);
    }
    play(NIT_TRACK);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

const VOLUME_STEP = 0.1;

function VolumeUp() {
  const { ref } = useAudioPlayer();
  const handleClick = () => {
    if (ref.current)
      ref.current.volume = Math.min(1, ref.current.volume + VOLUME_STEP);
  };
  return (
    <Button variant="outline" size="icon" className="size-7 rounded-full" onClick={handleClick}>
      <Volume2 />
    </Button>
  );
}

function VolumeDown() {
  const { ref } = useAudioPlayer();
  const handleClick = () => {
    if (ref.current)
      ref.current.volume = Math.max(0, ref.current.volume - VOLUME_STEP);
  };
  return (
    <Button variant="outline" size="icon" className="size-7 rounded-full" onClick={handleClick}>
      <Volume1 />
    </Button>
  );
}

export function EasterEggPlayer({ onClose }: { onClose: () => void }) {
  const [settled, setSettled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  // Position is entirely owned by these motion values — element sits at fixed top-0 left-0
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setSettled(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Center widget before first paint (runs after portal commits to DOM).
  // offsetWidth/offsetHeight give layout dimensions without CSS transform scaling,
  // so the center is correct even though framer-motion has initial={{ scale: 0.5 }}.
  useLayoutEffect(() => {
    if (!mounted || !playerRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = playerRef.current;
    x.set((window.innerWidth - w) / 2);
    y.set((window.innerHeight - h) / 2);
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Spring to bottom-right corner after 1.5s
  useEffect(() => {
    if (!settled || !playerRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = playerRef.current;
    animate(x, window.innerWidth - w - GAP, SPRING);
    animate(y, window.innerHeight - h - GAP, SPRING);
  }, [settled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = useCallback(() => {
    if (!playerRef.current) return;
    const { left, top, width, height } = playerRef.current.getBoundingClientRect();

    const distLeft   = left;
    const distRight  = window.innerWidth  - left - width;
    const distTop    = top;
    const distBottom = window.innerHeight - top  - height;
    const min = Math.min(distLeft, distRight, distTop, distBottom);

    const clampX = () => Math.max(GAP, Math.min(left, window.innerWidth  - width  - GAP));
    const clampY = () => Math.max(GAP, Math.min(top,  window.innerHeight - height - GAP));

    if (min === distLeft) {
      animate(x, GAP, SPRING);
      animate(y, clampY(), SPRING);
    } else if (min === distRight) {
      animate(x, window.innerWidth - width - GAP, SPRING);
      animate(y, clampY(), SPRING);
    } else if (min === distTop) {
      animate(y, GAP, SPRING);
      animate(x, clampX(), SPRING);
    } else {
      animate(y, window.innerHeight - height - GAP, SPRING);
      animate(x, clampX(), SPRING);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {!settled && (
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={playerRef}
        className={cn("fixed top-0 left-0 z-50 touch-none", settled && "cursor-grab active:cursor-grabbing")}
        style={{ x, y }}
        drag={settled}
        dragMomentum={false}
        dragElastic={0}
        onDragEnd={handleDragEnd}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          scale: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
          opacity: { duration: 0.25 },
        }}
      >
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-10 cursor-pointer rounded-full bg-background/80 p-1 hover:bg-background transition-colors"
            aria-label="Close player"
          >
            <X className="size-3" />
          </button>

          <AudioPlayerProvider>
            <AutoPlay />
            <Widget design="mumbai" className="justify-between gap-3">
              <WidgetContent>
                <div className="relative size-full">
                  <img
                    src={NIT_TRACK.data.coverUrl}
                    alt={NIT_TRACK.data.title}
                    className="max-h-28 w-full rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 z-10 rounded-md bg-linear-to-t from-black via-black/50 to-transparent" />
                  <Label className="text-muted-foreground absolute bottom-7 left-2 z-10 text-xs font-normal">
                    Now Playing
                  </Label>
                  <Label className="absolute bottom-2 left-2 z-10 w-36 overflow-hidden text-sm">
                    <span className="inline-block whitespace-nowrap">
                      {NIT_TRACK.data.title}
                    </span>
                  </Label>
                </div>
              </WidgetContent>
              <WidgetFooter className="gap-2">
                <AudioPlayerButton
                  variant="outline"
                  className="flex-1 rounded-full"
                  item={NIT_TRACK}
                />
                <VolumeDown />
                <VolumeUp />
              </WidgetFooter>
            </Widget>
          </AudioPlayerProvider>
        </div>
      </motion.div>
    </>,
    document.body,
  );
}
