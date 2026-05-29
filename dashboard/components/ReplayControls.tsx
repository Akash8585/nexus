"use client";

import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  SkipBack,
} from "lucide-react";

import { Button } from "@/components/ui/Button";

export type ReplaySpeed = 0.5 | 1 | 2;

export function ReplayControls({
  totalSteps,
  currentStep,
  isPlaying,
  speed,
  isComplete,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onReset,
  onSpeedChange,
}: {
  totalSteps: number;
  currentStep: number;
  isPlaying: boolean;
  speed: ReplaySpeed;
  isComplete: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
}) {
  return (
    <section className="flex flex-col items-center gap-4 rounded-[8px] border border-[#3d3a39] bg-[#101010] p-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="secondary"
          onClick={onReset}
          aria-label="Reset replay"
          className="h-11 w-11 px-0"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          onClick={onStepBack}
          disabled={currentStep === 0}
          aria-label="Step back"
          className="h-11 w-11 px-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="primary"
          onClick={isPlaying ? onPause : onPlay}
          disabled={totalSteps === 0 || (isComplete && !isPlaying)}
          aria-label={isPlaying ? "Pause replay" : "Play replay"}
          className="h-14 w-14 px-0"
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>
        <Button
          variant="secondary"
          onClick={onStepForward}
          disabled={currentStep >= totalSteps}
          aria-label="Step forward"
          className="h-11 w-11 px-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-[#bdbdbd]">
        <span className="font-mono">
          {isComplete ? "Replay complete" : `Step ${currentStep} of ${totalSteps}`}
        </span>
        <label className="flex items-center gap-2 text-xs text-[#8b949e]">
          Speed
          <select
            value={String(speed)}
            onChange={(event) =>
              onSpeedChange(Number(event.target.value) as ReplaySpeed)
            }
            className="rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-3 py-2 text-sm text-[#f2f2f2] outline-none transition focus:border-[#00d992]"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
          </select>
        </label>
      </div>
    </section>
  );
}
