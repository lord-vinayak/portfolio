"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animate, AnimatePresence, motion, useMotionValue } from "framer-motion";
import confetti from "canvas-confetti";
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
import { DiaTextReveal } from "@/components/ui/dia-text-reveal";

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
const GAP = 24;
const SPRING = { type: "spring", stiffness: 400, damping: 35 } as const;
const DISCOVERY_MS = 4000; // how long the discovery message shows

// ---------------------------------------------------------------------------
// Inner components (must be inside AudioPlayerProvider)
// ---------------------------------------------------------------------------

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
  return (
    <Button
      variant="outline"
      size="icon"
      className="size-7 rounded-full"
      onClick={() => { if (ref.current) ref.current.volume = Math.min(1, ref.current.volume + VOLUME_STEP); }}
    >
      <Volume2 />
    </Button>
  );
}

function VolumeDown() {
  const { ref } = useAudioPlayer();
  return (
    <Button
      variant="outline"
      size="icon"
      className="size-7 rounded-full"
      onClick={() => { if (ref.current) ref.current.volume = Math.max(0, ref.current.volume - VOLUME_STEP); }}
    >
      <Volume1 />
    </Button>
  );
}


function DiscoveryScreen() {
  useEffect(() => {
    const end = Date.now() + DISCOVERY_MS - 200;
    const colors = ["#a855f7", "#3b82f6", "#ec4899", "#f59e0b", "#10b981"];

    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors, zIndex: 45 });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors, zIndex: 45 });
      if (Date.now() < end) requestAnimationFrame(frame);
    };

    frame();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="text-center px-8">
        <DiaTextReveal
          text={[
            "Great! You found my easter egg!",
            "Here's a song for you!",
          ]}
          repeat
          repeatDelay={0.5}
          startOnView={false}
          duration={1.4}
          fixedWidth
          textColor="white"
          colors={["#56BF5D", "#84BF69", "#D9D389", "#D9D389", "#591F12"]}
          className="text-2xl font-bold drop-shadow-lg"
        />
      </div>
    </div>
  );
}


export function EasterEggPlayer({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false); // true after DISCOVERY_MS
  const [settled, setSettled] = useState(false);       // true 1.5s after player shows
  const playerRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);

  useEffect(() => {
    setMounted(true);
    const t1 = setTimeout(() => setShowPlayer(true), DISCOVERY_MS);
    const t2 = setTimeout(() => setSettled(true), DISCOVERY_MS + 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Center player before first paint — runs when showPlayer flips (player mounts then)
  useLayoutEffect(() => {
    if (!showPlayer || !playerRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = playerRef.current;
    x.set((window.innerWidth - w) / 2);
    y.set((window.innerHeight - h) / 2);
  }, [showPlayer]); 

  // Spring to bottom-right corner after settled
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
      animate(x, GAP, SPRING);               animate(y, clampY(), SPRING);
    } else if (min === distRight) {
      animate(x, window.innerWidth - width - GAP, SPRING);  animate(y, clampY(), SPRING);
    } else if (min === distTop) {
      animate(y, GAP, SPRING);               animate(x, clampX(), SPRING);
    } else {
      animate(y, window.innerHeight - height - GAP, SPRING); animate(x, clampX(), SPRING);
    }
  }, []); 

  if (!mounted) return null;

  return createPortal(
    // AudioPlayerProvider wraps everything so audio plays during discovery phase too
    <AudioPlayerProvider>
      <AutoPlay />

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

      {/* Discovery message + confetti */}
      <AnimatePresence>
        {!showPlayer && <DiscoveryScreen key="discovery" />}
      </AnimatePresence>

      {/* Player widget — appears after discovery phase */}
      <AnimatePresence>
        {showPlayer && (
          <motion.div
            key="player"
            ref={playerRef}
            className={cn(
              "fixed top-0 left-0 z-50 touch-none",
              settled && "cursor-grab active:cursor-grabbing",
            )}
            style={{ x, y }}
            drag={settled}
            dragMomentum={false}
            dragElastic={0}
            onDragEnd={handleDragEnd}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AudioPlayerProvider>,
    document.body,
  );
}
