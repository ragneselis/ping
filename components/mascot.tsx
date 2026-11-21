"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BLOCK, MASCOT_PALETTE as PALETTE, STUDENT } from "@/lib/mascots";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/*
 * Ping's pixel mascots. Original 16 x 16 pixel art, drawn as one <rect> per pixel with
 * shape-rendering="crispEdges", sized 64px on phones and 128px from md: 4 or 8px per pixel, so
 * each mascot pixel covers exactly 1 x 1 or 2 x 2 pixels of the 4px tile grid and nothing is resampled.
 * Each sits on its own square tile (--mascot-tile-*), which turns dark emerald in dark mode; the pixel
 * colours stay the same in both themes.
 *
 * Animation is frame-based, like a sprite: every frame is a full 16 x 16 drawing, and movement is a
 * whole-pixel offset of the sprite inside its tile. Nothing is ever eased or scaled between pixels, so
 * every frame is as crisp as the still. Under prefers-reduced-motion the mascot simply stands still.
 *   entrance  block: drops in, stretches as it falls, squashes on landing. student: pops up from below.
 *   idle      both blink (eyes closed for one frame) at irregular intervals.
 *   hover/tap block: waves an arm and hops. student: looks left and right, a pixel "ping" above the
 *             head. At most once every 600ms, with the mascot chirp.
 * Decorative only: aria-hidden, never covering text.
 */

const withRows = (base: string[], rows: Record<number, string>) => base.map((r, i) => rows[i] ?? r);
const LEGS = "...kk......kk...";
const EMPTY = "................";

const FRAMES = {
  block: {
    base: BLOCK,
    blink: withRows(BLOCK, { 5: "..kggggggggggk..", 6: "..kggkkggkkggk.." }),
    // Falling: legs stretched one pixel longer, body one pixel higher.
    stretch: [EMPTY, ...BLOCK.slice(2, 13), LEGS, LEGS, LEGS, EMPTY],
    // Landing: body one pixel shorter (a middle row drops out), legs planted.
    squash: [EMPTY, EMPTY, EMPTY, ...BLOCK.slice(2, 10), ...BLOCK.slice(11, 15), EMPTY],
    // Right arm raised for the wave.
    wave: withRows(BLOCK, {
      5: "..kggwkggwkggk.k",
      6: "..kggwkggwkggkk.",
      7: ".kkggggggggggk..",
      8: "k.kgggkkkggggk..",
    }),
  },
  student: {
    base: STUDENT,
    blink: withRows(STUDENT, { 7: "...kkkkwwkkkk..." }),
    lookLeft: withRows(STUDENT, { 7: "...kkwwwwkwwk..." }),
    lookRight: withRows(STUDENT, { 7: "...kwwkwwwwkk..." }),
  },
} as const;

/** The "ping" above the student's head: pairs of signal pixels moving outward, like (( )). */
const RING = (cols: number[]): [number, number][] => cols.flatMap((x) => [[x, 0], [x, 1]] as [number, number][]);
const PING = [RING([7, 8]), RING([5, 10]), RING([5, 10, 3, 12]), RING([3, 12]), []];

type Frame = { rows: readonly string[]; dy?: number; fx?: [number, number][] };
type Step = Frame & { ms: number };

const SEQUENCES: Record<"block" | "student", { intro: Step[]; play: Step[] }> = {
  block: {
    intro: [
      { rows: FRAMES.block.stretch, dy: -16, ms: 40 },
      { rows: FRAMES.block.stretch, dy: -11, ms: 60 },
      { rows: FRAMES.block.stretch, dy: -6, ms: 60 },
      { rows: FRAMES.block.stretch, dy: -2, ms: 60 },
      { rows: FRAMES.block.squash, dy: 0, ms: 110 },
      { rows: FRAMES.block.base, dy: -1, ms: 70 },
      { rows: FRAMES.block.base, dy: 0, ms: 0 },
    ],
    play: [
      { rows: FRAMES.block.wave, dy: 0, ms: 80 },
      { rows: FRAMES.block.base, dy: -2, ms: 80 },
      { rows: FRAMES.block.wave, dy: -3, ms: 80 },
      { rows: FRAMES.block.base, dy: -2, ms: 80 },
      { rows: FRAMES.block.wave, dy: 0, ms: 90 },
      { rows: FRAMES.block.base, dy: 0, ms: 0 },
    ],
  },
  student: {
    intro: [
      { rows: FRAMES.student.base, dy: 16, ms: 50 },
      { rows: FRAMES.student.base, dy: 10, ms: 60 },
      { rows: FRAMES.student.base, dy: 5, ms: 60 },
      { rows: FRAMES.student.base, dy: 1, ms: 60 },
      { rows: FRAMES.student.base, dy: -1, ms: 90 },
      { rows: FRAMES.student.base, dy: 0, ms: 0 },
    ],
    play: [
      { rows: FRAMES.student.lookLeft, fx: PING[0], ms: 90 },
      { rows: FRAMES.student.lookLeft, fx: PING[1], ms: 90 },
      { rows: FRAMES.student.lookRight, fx: PING[2], ms: 90 },
      { rows: FRAMES.student.lookRight, fx: PING[3], ms: 90 },
      { rows: FRAMES.student.base, fx: PING[4], ms: 0 },
    ],
  },
};

const ART = { block: BLOCK, student: STUDENT } as const;
export type MascotName = keyof typeof ART;

const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Sizes are integer scales on the tile grid only: 4px (64) or 8px (128) per pixel. */
export function Mascot({ name, className, style }: { name: MascotName; className?: string; style?: React.CSSProperties }) {
  const [frame, setFrame] = useState<Frame>({ rows: ART[name] });
  // Hidden by CSS until the entrance starts, so the still never flashes before the drop-in.
  const [intro, setIntro] = useState<"pending" | "done">("pending");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busy = useRef(false);
  const lastPlay = useRef(0);

  const run = useCallback((steps: Step[]) => {
    busy.current = true;
    let at = 0;
    steps.forEach((s, i) => {
      timers.current.push(
        setTimeout(() => {
          setFrame({ rows: s.rows, dy: s.dy, fx: s.fx });
          if (i === steps.length - 1) busy.current = false;
        }, at),
      );
      at += s.ms;
    });
  }, []);

  useEffect(() => {
    const list = timers.current;
    if (prefersReduced()) {
      setIntro("done");
      return;
    }
    setIntro("done");
    run(SEQUENCES[name].intro);
    // Idle blink at irregular intervals: eyes closed for one frame.
    const blink = () => {
      list.push(
        setTimeout(
          () => {
            if (!busy.current && document.visibilityState === "visible") {
              setFrame((f) => ({ ...f, rows: FRAMES[name].blink }));
              list.push(setTimeout(() => setFrame((f) => ({ ...f, rows: ART[name] })), 120));
            }
            blink();
          },
          2200 + Math.random() * 4200,
        ),
      );
    };
    blink();
    return () => {
      list.forEach(clearTimeout);
      list.length = 0;
    };
  }, [name, run]);

  const play = (e: React.PointerEvent) => {
    // Hover with a mouse, tap on touch; never more than once every 600ms.
    if (e.type === "pointerenter" && e.pointerType !== "mouse") return;
    if (e.type === "pointerdown" && e.pointerType === "mouse") return;
    const now = performance.now();
    if (now - lastPlay.current < 600 || busy.current) return;
    lastPlay.current = now;
    sound.chirp();
    if (prefersReduced()) return;
    run(SEQUENCES[name].play);
  };

  const dy = frame.dy ?? 0;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      data-mascot-intro={intro}
      onPointerEnter={play}
      onPointerDown={play}
      className={cn("pointer-events-auto block size-16 shrink-0 md:size-32", className)}
      style={style}
    >
      <rect width="16" height="16" fill={`var(--mascot-tile-${name})`} />
      <g data-sprite transform={dy ? `translate(0 ${dy})` : undefined}>
        {frame.rows.flatMap((row, y) =>
          [...row].map((px, x) => (px === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={PALETTE[px]} />)),
        )}
      </g>
      {frame.fx?.map(([x, y]) => <rect key={`fx-${x}-${y}`} x={x} y={y} width="1" height="1" fill={PALETTE.r} />)}
    </svg>
  );
}
