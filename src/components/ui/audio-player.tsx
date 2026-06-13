"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { Loader2, Pause, Play, Settings } from "lucide-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AudioPlayerItem<TData = unknown> {
  id: string | number;
  src: string;
  data?: TData;
}

interface AudioPlayerContextValue<TData = unknown> {
  ref: React.RefObject<HTMLAudioElement | null>;
  activeItem: AudioPlayerItem<TData> | null;
  duration: number;
  error: MediaError | null;
  isPlaying: boolean;
  isBuffering: boolean;
  playbackRate: number;
  isItemActive: (item: AudioPlayerItem<TData>) => boolean;
  setActiveItem: (item: AudioPlayerItem<TData>) => void;
  play: (item?: AudioPlayerItem<TData> | null) => void;
  pause: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayer<TData = unknown>() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used inside AudioPlayerProvider");
  return ctx as AudioPlayerContextValue<TData>;
}

export function useAudioPlayerTime() {
  const { ref } = useAudioPlayer();
  const [time, setTime] = useState(0);

  useEffect(() => {
    let id: number;
    const tick = () => {
      if (ref.current) setTime(ref.current.currentTime);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [ref]);

  return time;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [activeItem, setActiveItemState] = useState<AudioPlayerItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<MediaError | null>(null);
  const [playbackRate, setPlaybackRateState] = useState(1);

  const setActiveItem = useCallback((item: AudioPlayerItem) => {
    setActiveItemState(item);
  }, []);

  const play = useCallback(
    (item?: AudioPlayerItem | null) => {
      const audio = ref.current;
      if (!audio) return;

      const target = item ?? activeItem;
      if (!target) return;

      if (activeItem?.id !== target.id) {
        setActiveItemState(target);
        audio.src = target.src;
        audio.load();
      }

      audio.playbackRate = playbackRate;
      audio.play().catch(() => {});
    },
    [activeItem, playbackRate]
  );

  const pause = useCallback(() => {
    ref.current?.pause();
  }, []);

  const seek = useCallback((time: number) => {
    if (ref.current) ref.current.currentTime = time;
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (ref.current) ref.current.playbackRate = rate;
  }, []);

  const isItemActive = useCallback(
    (item: AudioPlayerItem) => activeItem?.id === item.id,
    [activeItem]
  );

  return (
    <AudioPlayerContext.Provider
      value={{
        ref,
        activeItem,
        duration,
        error,
        isPlaying,
        isBuffering,
        playbackRate,
        isItemActive,
        setActiveItem,
        play,
        pause,
        seek,
        setPlaybackRate,
      }}
    >
      <audio
        ref={ref}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onError={(e) =>
          setError((e.target as HTMLAudioElement).error)
        }
      />
      {children}
    </AudioPlayerContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// AudioPlayerButton
// ---------------------------------------------------------------------------

interface AudioPlayerButtonProps<TData = unknown> extends ButtonProps {
  item?: AudioPlayerItem<TData>;
}

export function AudioPlayerButton<TData = unknown>({
  item,
  ...props
}: AudioPlayerButtonProps<TData>) {
  const { isPlaying, isBuffering, isItemActive, play, pause, activeItem } =
    useAudioPlayer<TData>();

  const isActive = item ? isItemActive(item) : !!activeItem;
  const playing = isActive && isPlaying;
  const buffering = isActive && isBuffering;

  const handleClick = () => {
    if (item && !isItemActive(item)) {
      play(item);
    } else if (playing) {
      pause();
    } else {
      play(item ?? activeItem);
    }
  };

  return (
    <Button onClick={handleClick} {...props}>
      {buffering ? (
        <Loader2 className="size-4 animate-spin" />
      ) : playing ? (
        <Pause className="size-4" />
      ) : (
        <Play className="size-4" />
      )}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// AudioPlayerProgress
// ---------------------------------------------------------------------------

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>;

interface AudioPlayerProgressProps
  extends Omit<SliderProps, "min" | "max" | "value"> {}

export function AudioPlayerProgress({ className, ...props }: AudioPlayerProgressProps) {
  const { duration, isPlaying, play, pause, activeItem, seek } = useAudioPlayer();
  const time = useAudioPlayerTime();
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const wasPlayingRef = useRef(false);

  return (
    <SliderPrimitive.Root
      min={0}
      max={duration || 100}
      step={0.1}
      value={[isSeeking ? seekValue : time]}
      onValueChange={(vals) => {
        if (!isSeeking) {
          wasPlayingRef.current = isPlaying;
          if (isPlaying) pause();
          setIsSeeking(true);
        }
        setSeekValue(vals[0]);
      }}
      onValueCommit={(vals) => {
        seek(vals[0]);
        setIsSeeking(false);
        if (wasPlayingRef.current && activeItem) play(activeItem);
      }}
      onKeyDown={(e) => {
        if (e.code === "Space") {
          e.preventDefault();
          if (isPlaying) pause();
          else if (activeItem) play(activeItem);
        }
      }}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-3 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// AudioPlayerTime / AudioPlayerDuration
// ---------------------------------------------------------------------------

function formatTime(seconds: number) {
  if (!isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayerTime({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  const time = useAudioPlayerTime();
  return (
    <span className={cn("text-xs tabular-nums", className)} {...props}>
      {formatTime(time)}
    </span>
  );
}

export function AudioPlayerDuration({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  const { duration } = useAudioPlayer();
  return (
    <span className={cn("text-xs tabular-nums", className)} {...props}>
      {formatTime(duration)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// AudioPlayerSpeed
// ---------------------------------------------------------------------------

const DEFAULT_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

interface AudioPlayerSpeedProps extends ButtonProps {
  speeds?: readonly number[];
}

export function AudioPlayerSpeed({
  speeds = DEFAULT_SPEEDS,
  variant = "ghost",
  size = "icon",
  ...props
}: AudioPlayerSpeedProps) {
  const { playbackRate, setPlaybackRate } = useAudioPlayer();
  const currentIndex = speeds.indexOf(playbackRate as (typeof DEFAULT_SPEEDS)[number]);

  const cycleSpeed = () => {
    const next = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackRate(next);
  };

  return (
    <Button variant={variant} size={size} onClick={cycleSpeed} {...props}>
      <Settings className="size-4" />
    </Button>
  );
}

// ---------------------------------------------------------------------------
// AudioPlayerSpeedButtonGroup
// ---------------------------------------------------------------------------

const GROUP_SPEEDS = [0.5, 1, 1.5, 2] as const;

interface AudioPlayerSpeedButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  speeds?: readonly number[];
}

export function AudioPlayerSpeedButtonGroup({
  speeds = GROUP_SPEEDS,
  className,
  ...props
}: AudioPlayerSpeedButtonGroupProps) {
  const { playbackRate, setPlaybackRate } = useAudioPlayer();

  return (
    <div className={cn("flex items-center gap-1", className)} {...props}>
      {speeds.map((speed) => (
        <Button
          key={speed}
          variant={playbackRate === speed ? "default" : "outline"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setPlaybackRate(speed)}
        >
          {speed === 1 ? "Normal" : `${speed}x`}
        </Button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// exampleTrack (placeholder — matches the AudioPlayerItem shape)
// ---------------------------------------------------------------------------

export const exampleTrack: AudioPlayerItem<{ title: string; artist: string }> = {
  id: "example",
  src: "/audio/song.mp3",
  data: {
    title: "My Song",
    artist: "Artist",
  },
};
