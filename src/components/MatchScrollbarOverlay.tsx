import { cn } from "@/lib/utils";

/**
 * Vertical strip of tick marks indicating match positions, aligned with the
 * native scrollbar thumb (Chrome-style find-in-page). Render as an absolutely-
 * positioned sibling next to a scroll container, inside a shared `relative`
 * wrapper. Stays pinned regardless of scrolling.
 *
 * Positioning model: each tick is placed where the scrollbar thumb's CENTER
 * would be when scrolled such that the match is centered in the viewport.
 * That mirrors how the browser maps document Y → thumb position, so ticks
 * line up with the thumb after navigating to a match.
 */
export function MatchScrollbarOverlay({
  positions,
  scrollHeight,
  clientHeight,
  activeIndex,
  onTickClick,
  topOffset = 0,
  bottomOffset = 0,
}: {
  /** Absolute Y (px) of each match in document/scroll space. -1 = unknown. */
  positions: number[];
  scrollHeight: number;
  clientHeight: number;
  activeIndex: number;
  onTickClick: (idx: number) => void;
  topOffset?: number;
  bottomOffset?: number;
}) {
  // The native scrollbar spans the FULL clientHeight (it doesn't know about
  // our sticky header / topOffset). We compute thumb position in that native
  // coordinate space, then translate into overlay-local coords by subtracting
  // topOffset. Otherwise ticks drift relative to the actual thumb.
  const nativeTrack = Math.max(1, clientHeight);
  const maxScroll = Math.max(1, scrollHeight - clientHeight);
  // Browsers approximate thumb size as (clientHeight / scrollHeight) * track,
  // clamped to a minimum (typically ~20px in WebKit/Blink).
  const thumbHeight = Math.max(20, (clientHeight / Math.max(scrollHeight, 1)) * nativeTrack);
  const usableTrack = Math.max(1, nativeTrack - thumbHeight);

  return (
    <div
      className="pointer-events-none absolute right-0 z-20"
      style={{
        top: topOffset,
        bottom: bottomOffset,
        width: 14,
      }}
      aria-hidden="true"
    >
      <div className="relative w-full h-full">
        {positions.map((y, i) => {
          if (y < 0) return null;
          // Scroll position that would center the match in the viewport.
          const desiredScroll = Math.min(maxScroll, Math.max(0, y - clientHeight / 2));
          // Thumb top in NATIVE scrollbar coords (origin = top of container).
          const thumbTopNative = (desiredScroll / maxScroll) * usableTrack;
          // Thumb center in native coords, then translate into overlay-local
          // coords (overlay starts at topOffset within the container).
          const tickCenter = thumbTopNative + thumbHeight / 2 - topOffset;
          const isActive = i === activeIndex;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onTickClick(i)}
              aria-label={`Jump to match ${i + 1}`}
              className={cn(
                "pointer-events-auto absolute right-1 rounded-sm transition-colors",
                isActive ? "bg-primary" : "bg-primary/55 hover:bg-primary/85",
              )}
              style={{
                top: `${tickCenter - (isActive ? 2 : 1)}px`,
                height: isActive ? 4 : 2,
                width: isActive ? 10 : 7,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
