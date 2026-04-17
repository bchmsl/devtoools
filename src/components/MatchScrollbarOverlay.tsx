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
  // Track height available to ticks = visible viewport minus our offsets.
  // The scrollbar thumb traverses [0, trackHeight - thumbHeight].
  const trackHeight = Math.max(0, clientHeight - topOffset - bottomOffset);
  const maxScroll = Math.max(1, scrollHeight - clientHeight);
  // Approximate native thumb height (browsers use ~ clientHeight/scrollHeight ratio).
  const thumbHeight = Math.max(20, (clientHeight / Math.max(scrollHeight, 1)) * trackHeight);
  const usableTrack = Math.max(1, trackHeight - thumbHeight);

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
          // Where the thumb's TOP sits at that scroll position.
          const thumbTop = (desiredScroll / maxScroll) * usableTrack;
          // Place tick at the thumb's CENTER for that scroll.
          const tickCenter = thumbTop + thumbHeight / 2;
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
