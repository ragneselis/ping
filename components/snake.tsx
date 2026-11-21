"use client";

import { useEffect, useRef } from "react";
import { type TileName, tileDataUri } from "@/components/tiles";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/**
 * A playable Snake built from Ping's pixel tiles. Ported from GrönLoop's closing call to action
 * (~/Documents/gronloop/src/components/cta-snake.tsx), keeping its behaviour and controls:
 *
 *   - Every segment is a plain <div> with a tile as its background. A tick moves each segment a whole
 *     cell; there is no positional tween, only opacity fades on spawn and death (the blocky, stepped read).
 *   - It idles in an attract-mode demo that plays itself (greedy best-first search to the nearest tile,
 *     with a room-maximising fallback), and becomes a real game when clicked, tapped, or on Enter/Space.
 *   - Play: arrow keys or WASD steer, a reversal into your own neck is ignored, walls and your own body
 *     end the game, each tile eaten scores 1 and spawns the next. Ready, Go, Game over, Play again.
 *   - Arrow keys are only swallowed while a game is running, so the page still scrolls otherwise.
 *   - Touch: tap to start, swipe to steer (24px dead zone).
 *
 * Changes for Ping:
 *   - Ping's pixel tiles (as SVG data URIs) instead of GrönLoop's marble PNGs.
 *   - Exact 32px cells: the board is sized to whole cells, so tiles always sit on whole pixels and stay
 *     crisp (GrönLoop stretched cells to fill the box, which gives fractional sizes).
 *   - Eating a tile in a game plays a small ping (when sound is on). The self-playing demo stays silent.
 *   - The loop pauses while the board is off screen or the tab is hidden.
 *   - Touch scrolling is only blocked while a game is running, so the band never traps a swipe.
 *   - Reduced motion: a still arrangement (snake and a few tiles), no demo. Clicking still starts a game,
 *     as in GrönLoop, because that motion is asked for.
 */

/** Ping's tile grid. Cells are exactly this size. */
const CELL = 32;
const MIN_COLS = 6;
const MAX_COLS = 40;
const MIN_ROWS = 4;
const MAX_ROWS = 30;

/** ms per tick. */
/** A game starts slow and easy, and each tile eaten makes it about 6% faster, down to a floor. */
const TICK_PLAY_START = 260;
const TICK_PLAY_MIN = 120;
const SPEED_UP = 0.94;
/** The self-playing demo keeps a calm, constant pace. */
const TICK_DEMO = 220;
const DEMO_FOOD = 5;
const SPAWN_STAGGER = 240;
const FADE_SEG = 320;
const FADE_FOOD = 240;
const HEURISTIC = 1.8;

const DIRS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
] as const;

/** On the dark emerald band the deep tiles read as holes, so the snake uses the lighter ones. The head is
 *  the two-tone checker (legible as the leading square) and game food is the pale tile, the brightest,
 *  so it reads as a target. */
const BODY_TILES: TileName[] = ["stripe", "solid", "corner"];
const HEAD_TILE: TileName = "checker";
const FOOD_TILE: TileName = "pale";
const DEMO_FOOD_TILES: TileName[] = ["pale", "corner", "stripe", "checker", "solid"];

const COPY = {
  label: "Snake, playable",
  score: "Score",
  speed: "speed",
  ready: "READY?",
  go: "GO!",
  gameOver: "GAME OVER",
  again: "Play again?",
  hint: "Press Enter to play Snake. Steer with the arrow keys.",
};

type Cell = { x: number; y: number };
type Seg = Cell & { el: HTMLDivElement };
type Food = Cell & { el: HTMLDivElement };
type Mode = "demo" | "countdown" | "playing" | "dead";

export function Snake({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLParagraphElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const board = boardRef.current;
    const scoreEl = scoreRef.current;
    const messageEl = messageRef.current;
    if (!stage || !board || !scoreEl || !messageEl) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const urls = new Map<TileName, string>();
    const tileUrl = (name: TileName) => {
      if (!urls.has(name)) urls.set(name, tileDataUri(name));
      return urls.get(name)!;
    };

    let cols = MIN_COLS;
    let rows = MIN_ROWS;
    let snake: Seg[] = [];
    let food: Food[] = [];
    let dir: Cell = { x: 1, y: 0 };
    let queued: Cell | null = null;
    let mode: Mode = "demo";
    let running = false;
    let score = 0;
    let disposed = false;
    let onScreen = true;

    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (!disposed) fn();
      }, ms);
      timers.add(id);
      return id;
    };

    const inBounds = (x: number, y: number) => x >= 0 && x < cols && y >= 0 && y < rows;
    const key = (x: number, y: number) => `${x},${y}`;
    // Whole cells of whole pixels: every position is an integer number of pixels.
    const place = (el: HTMLElement, x: number, y: number) => {
      el.style.transform = `translate3d(${x * CELL}px, ${y * CELL}px, 0)`;
    };

    const makeSquare = (tile: TileName, cls: string) => {
      const el = document.createElement("div");
      el.className = cls;
      el.style.cssText = `position:absolute;top:0;left:0;width:${CELL}px;height:${CELL}px;background-image:${tileUrl(tile)};background-size:100% 100%;background-repeat:no-repeat;image-rendering:pixelated;`;
      return el;
    };

    const addSeg = (x: number, y: number, tile: TileName): Seg => {
      const el = makeSquare(tile, "snake-seg");
      if (!reduced) el.style.transition = `opacity ${FADE_SEG}ms`;
      place(el, x, y);
      board.appendChild(el);
      return { x, y, el };
    };

    const paintHead = () => {
      snake.forEach((s, i) => {
        s.el.style.backgroundImage = tileUrl(i === 0 ? HEAD_TILE : BODY_TILES[i % BODY_TILES.length]);
        s.el.style.zIndex = i === 0 ? "3" : "2";
      });
    };

    const clearAll = () => {
      snake.forEach((s) => s.el.remove());
      food.forEach((f) => f.el.remove());
      snake = [];
      food = [];
    };

    /** Cells the snake occupies, minus the tail (it moves away on the same tick). */
    const body = () => {
      const set = new Set<string>();
      for (let i = 0; i < snake.length - 1; i++) set.add(key(snake[i].x, snake[i].y));
      return set;
    };

    const freeCells = () => {
      const taken = new Set([...snake.map((s) => key(s.x, s.y)), ...food.map((f) => key(f.x, f.y))]);
      const out: Cell[] = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!taken.has(key(x, y))) out.push({ x, y });
      return out;
    };

    const spawnFood = (tile: TileName = FOOD_TILE, fade = true) => {
      const open = freeCells();
      if (!open.length) return null;
      const spot = open[Math.floor(Math.random() * open.length)];
      const el = makeSquare(tile, "snake-food");
      el.style.zIndex = "1";
      place(el, spot.x, spot.y);
      if (fade && !reduced) {
        el.style.transition = `opacity ${FADE_FOOD}ms`;
        el.style.opacity = "0";
        board.appendChild(el);
        // Lay it out at opacity 0 first, so the transition has a start. A forced layout does this
        // without waiting for an animation frame.
        void el.offsetWidth;
        el.style.opacity = "1";
      } else board.appendChild(el);
      const item = { ...spot, el };
      food.push(item);
      return item;
    };

    // ---- the demo's autopilot -----------------------------------------------

    const reachable = (blocked: Set<string>, x: number, y: number) => {
      const seen = new Set<string>();
      const stack: Cell[] = [];
      const push = (cx: number, cy: number) => {
        const k = key(cx, cy);
        if (inBounds(cx, cy) && !blocked.has(k) && !seen.has(k)) {
          seen.add(k);
          stack.push({ x: cx, y: cy });
        }
      };
      push(x, y);
      while (stack.length) {
        const cur = stack.pop()!;
        for (const [dx, dy] of DIRS) push(cur.x + dx, cur.y + dy);
      }
      return seen.size;
    };

    /** Greedy best-first search to the nearest tile; returns the first step, or null. */
    const chase = (blocked: Set<string>) => {
      const head = snake[0];
      if (!food.length) return null;
      const goals = new Set(food.map((f) => key(f.x, f.y)));
      const nearest = (x: number, y: number) => Math.min(...food.map((f) => Math.abs(f.x - x) + Math.abs(f.y - y)));
      const start = key(head.x, head.y);
      const cost = new Map([[start, 0]]);
      const est = new Map([[start, HEURISTIC * nearest(head.x, head.y)]]);
      const from = new Map<string, Cell | null>([[start, null]]);
      const open = new Set([start]);
      while (open.size) {
        let best: string | null = null;
        let bestEst = Infinity;
        for (const k of open) {
          const e = est.get(k)!;
          if (e < bestEst) {
            bestEst = e;
            best = k;
          }
        }
        if (best === null) break;
        if (goals.has(best)) {
          let node = best;
          let prev = from.get(best);
          while (prev && key(prev.x, prev.y) !== start) {
            node = key(prev.x, prev.y);
            prev = from.get(node);
          }
          const [gx, gy] = node.split(",").map(Number);
          return { x: gx - head.x, y: gy - head.y };
        }
        open.delete(best);
        const [bx, by] = best.split(",").map(Number);
        for (const [dx, dy] of DIRS) {
          const nx = bx + dx;
          const ny = by + dy;
          const nk = key(nx, ny);
          if (!inBounds(nx, ny) || blocked.has(nk)) continue;
          const next = cost.get(best)! + 1;
          if (next < (cost.get(nk) ?? Infinity)) {
            cost.set(nk, next);
            from.set(nk, { x: bx, y: by });
            est.set(nk, next + HEURISTIC * nearest(nx, ny));
            open.add(nk);
          }
        }
      }
      return null;
    };

    const nextDemoMove = () => {
      const blocked = body();
      const toFood = chase(blocked);
      if (toFood) return toFood;
      let best: Cell | null = null;
      let bestRoom = -1;
      for (const [dx, dy] of DIRS) {
        const nx = snake[0].x + dx;
        const ny = snake[0].y + dy;
        if (!inBounds(nx, ny) || blocked.has(key(nx, ny))) continue;
        const room = reachable(blocked, nx, ny);
        if (room > bestRoom) {
          bestRoom = room;
          best = { x: dx, y: dy };
        }
      }
      return best;
    };

    const advance = (nx: number, ny: number, eaten: Food | undefined) => {
      if (eaten) {
        const tail = snake[snake.length - 1];
        snake.push(addSeg(tail.x, tail.y, BODY_TILES[snake.length % BODY_TILES.length]));
        eaten.el.style.opacity = "0";
        later(() => eaten.el.remove(), FADE_FOOD);
      }
      for (let i = snake.length - 1; i > 0; i--) {
        snake[i].x = snake[i - 1].x;
        snake[i].y = snake[i - 1].y;
      }
      snake[0].x = nx;
      snake[0].y = ny;
      for (const s of snake) place(s.el, s.x, s.y);
      paintHead();
    };

    const demoTick = () => {
      if (!running) return;
      const move = nextDemoMove();
      if (!move) return endDemo();
      dir = move;
      const nx = snake[0].x + dir.x;
      const ny = snake[0].y + dir.y;
      const hit = food.findIndex((f) => f.x === nx && f.y === ny);
      advance(nx, ny, hit >= 0 ? food.splice(hit, 1)[0] : undefined);
      if (!food.length) endDemo();
    };

    const endDemo = () => {
      running = false;
      snake.forEach((s) => {
        s.el.style.opacity = "0";
      });
      later(() => {
        if (mode !== "demo") return;
        clearAll();
        later(() => mode === "demo" && startDemo(), 250);
      }, FADE_SEG + 40);
    };

    const startDemo = () => {
      if (mode !== "demo") return;
      clearAll();
      const cy = Math.floor(rows / 2);
      const cx = Math.floor(cols / 2);
      snake = [addSeg(cx, cy, HEAD_TILE), addSeg(cx - 1, cy, BODY_TILES[1]), addSeg(cx - 2, cy, BODY_TILES[0])];
      paintHead();
      dir = { x: 1, y: 0 };
      if (reduced) {
        // A still arrangement: the snake and a few loose tiles, placed at once.
        for (let i = 0; i < 3; i++) spawnFood(DEMO_FOOD_TILES[i], false);
        return;
      }
      let placed = 0;
      const drop = () => {
        if (mode !== "demo" || placed >= DEMO_FOOD) return;
        spawnFood(DEMO_FOOD_TILES[placed % DEMO_FOOD_TILES.length]);
        placed++;
        later(drop, SPAWN_STAGGER);
      };
      drop();
      later(() => {
        if (mode === "demo") running = true;
      }, DEMO_FOOD * SPAWN_STAGGER + 200);
    };

    // ---- the real game --------------------------------------------------------

    // The current pace and its level (1 at the start, +1 per speed-up until the floor is reached).
    let tickPlay = TICK_PLAY_START;
    let level = 1;
    const setScore = (n: number) => {
      score = n;
      scoreEl.textContent = `${COPY.score} ${n}, ${COPY.speed} ${level}`;
    };
    const showMessage = (title: string, sub?: string) => {
      messageEl.replaceChildren();
      const t = document.createElement("span");
      t.className = "font-heading text-title font-semibold tracking-tight";
      t.textContent = title;
      messageEl.append(t);
      if (sub) {
        const s = document.createElement("span");
        s.className = "label-mono mt-3 block opacity-80";
        s.textContent = sub;
        messageEl.append(s);
      }
      messageEl.dataset.show = "true";
      board.style.opacity = "0.5";
    };
    const hideMessage = () => {
      delete messageEl.dataset.show;
      board.style.opacity = "1";
    };
    const setPlaying = (on: boolean) => {
      if (on) stage.dataset.playing = "";
      else delete stage.dataset.playing;
    };

    const startGame = () => {
      // Always from a click, tap or key: start audio now so the eat ping can play during the game.
      sound.unlock();
      clearAll();
      hideMessage();
      mode = "countdown";
      setPlaying(true);
      running = false;
      // A new game (and "Play again") always starts at the easy pace.
      tickPlay = TICK_PLAY_START;
      level = 1;
      setScore(0);
      scoreEl.dataset.show = "true";
      const cy = Math.floor(rows / 2);
      const cx = Math.floor(cols / 2);
      snake = [addSeg(cx, cy, HEAD_TILE), addSeg(cx - 1, cy, BODY_TILES[0]), addSeg(cx - 2, cy, BODY_TILES[1])];
      paintHead();
      dir = { x: 1, y: 0 };
      queued = null;
      spawnFood();
      showMessage(COPY.ready);
      later(() => {
        if (mode === "countdown") showMessage(COPY.go);
      }, 800);
      later(() => {
        if (mode !== "countdown") return;
        hideMessage();
        mode = "playing";
        running = true;
        resume();
      }, 1450);
      resume();
    };

    const die = () => {
      mode = "dead";
      running = false;
      setPlaying(false);
      showMessage(COPY.gameOver, COPY.again);
    };

    const playTick = () => {
      if (!running) return;
      if (queued && !(queued.x === -dir.x && queued.y === -dir.y)) dir = queued;
      queued = null;
      const nx = snake[0].x + dir.x;
      const ny = snake[0].y + dir.y;
      if (!inBounds(nx, ny)) return die();
      const hit = food.findIndex((f) => f.x === nx && f.y === ny);
      const limit = hit >= 0 ? snake.length : snake.length - 1;
      for (let i = 0; i < limit; i++) if (snake[i].x === nx && snake[i].y === ny) return die();
      const eaten = hit >= 0 ? food.splice(hit, 1)[0] : undefined;
      advance(nx, ny, eaten);
      if (eaten) {
        sound.eat();
        const next = Math.max(TICK_PLAY_MIN, Math.round(tickPlay * SPEED_UP));
        if (next < tickPlay) {
          tickPlay = next;
          level++;
        }
        setScore(score + 1);
        spawnFood();
      }
    };

    // ---- the loop, paused off screen or in a hidden tab -------------------------

    let tickId: ReturnType<typeof setTimeout> | null = null;
    const active = () => onScreen && document.visibilityState === "visible";
    const loop = () => {
      tickId = null;
      if (!active() || (reduced && mode === "demo")) return;
      if (mode === "demo") demoTick();
      else if (mode === "playing") playTick();
      tickId = later(loop, mode === "playing" ? tickPlay : TICK_DEMO);
    };
    const resume = () => {
      if (tickId === null && active()) tickId = later(loop, mode === "playing" ? tickPlay : TICK_DEMO);
    };

    // ---- input -------------------------------------------------------------------

    const KEYS: Record<string, Cell> = {
      ArrowUp: { x: 0, y: -1 },
      KeyW: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      KeyS: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      KeyA: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      KeyD: { x: 1, y: 0 },
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "Space") {
        if (mode === "demo" || mode === "dead") {
          e.preventDefault();
          startGame();
        }
        return;
      }
      const move = KEYS[e.code];
      // Swallow the key only when the game uses it: during a game (countdown included) arrows never
      // scroll the page; otherwise they scroll as usual.
      if (!move || (mode !== "playing" && mode !== "countdown")) return;
      e.preventDefault();
      if (mode === "playing" && !(move.x === -dir.x && move.y === -dir.y)) queued = move;
    };
    const onClick = () => {
      if (mode === "demo" || mode === "dead") startGame();
    };
    let touchX = 0;
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchX;
      const dy = e.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
        // A tap. The click that follows would start the game twice; it is suppressed below.
        e.preventDefault();
        return onClick();
      }
      if (mode !== "playing") return;
      const move = Math.abs(dx) > Math.abs(dy) ? { x: dx > 0 ? 1 : -1, y: 0 } : { x: 0, y: dy > 0 ? 1 : -1 };
      if (!(move.x === -dir.x && move.y === -dir.y)) queued = move;
    };
    stage.addEventListener("keydown", onKey);
    stage.addEventListener("click", onClick);
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchend", onTouchEnd);

    // ---- sizing: whole cells only ---------------------------------------------------

    const measure = () => {
      const r = stage.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      const nextCols = Math.max(MIN_COLS, Math.min(MAX_COLS, Math.floor(r.width / CELL)));
      const nextRows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, Math.floor(r.height / CELL)));
      const changed = nextCols !== cols || nextRows !== rows;
      cols = nextCols;
      rows = nextRows;
      board.style.width = `${cols * CELL}px`;
      board.style.height = `${rows * CELL}px`;
      // Centre the whole-cell board in its box, on whole pixels.
      board.style.left = `${Math.floor((r.width - cols * CELL) / 2)}px`;
      board.style.top = `${Math.floor((r.height - rows * CELL) / 2)}px`;
      return changed;
    };

    measure();
    startDemo();
    resume();

    const ro = new ResizeObserver(() => {
      const changed = measure();
      if (changed && mode === "demo") startDemo();
    });
    ro.observe(stage);

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) resume();
    });
    io.observe(stage);
    const onVisibility = () => {
      if (document.visibilityState === "visible") resume();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      timers.forEach(clearTimeout);
      timers.clear();
      stage.removeEventListener("keydown", onKey);
      stage.removeEventListener("click", onClick);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchend", onTouchEnd);
      board.replaceChildren();
    };
  }, []);

  return (
    <div
      ref={stageRef}
      role="group"
      aria-label={COPY.label}
      tabIndex={0}
      data-sound="none"
      className={cn(
        "relative size-full cursor-pointer touch-pan-y overflow-hidden outline-none select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white data-playing:touch-none",
        className,
      )}
    >
      <div ref={boardRef} aria-hidden="true" className="absolute top-0 left-0 transition-opacity duration-200" />
      <p
        ref={scoreRef}
        aria-hidden="true"
        className="label-mono absolute top-3 right-3 z-10 opacity-0 transition-opacity duration-200 data-[show]:opacity-90"
      />
      <div
        ref={messageRef}
        aria-hidden="true"
        className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center opacity-0 transition-opacity duration-200 data-[show]:opacity-100"
      />
      <span className="sr-only">{COPY.hint}</span>
    </div>
  );
}
