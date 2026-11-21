import { Band } from "@/components/blueprint";
import { Snake } from "@/components/snake";

/**
 * The closing band above the footer on every page: a full-width emerald block with a short line on
 * the left and the playable snake on the right. The emerald (--band) is the same in both themes.
 */
export function ClosingBand() {
  return (
    <Band
      aria-label="Come back tomorrow"
      inner="grid items-center gap-6 bg-band py-8 text-band-foreground sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-12"
    >
      <div className="grid max-w-prose gap-3">
        <h2>New jobs land every day. Come back tomorrow.</h2>
        <p className="label-mono leading-relaxed text-band-foreground/75">
          <span className="hidden sm:inline">Click the board to play. Steer with the arrow keys.</span>
          <span className="sm:hidden">Tap the board to play. Swipe to steer.</span>
        </p>
      </div>
      <div className="h-48 border border-white/15 sm:h-56 lg:h-64">
        <Snake />
      </div>
    </Band>
  );
}
