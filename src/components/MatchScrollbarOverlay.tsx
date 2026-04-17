import { cn } from "@/lib/utils";

/**
 * Vertical strip of tick marks indicating match positions, rendered INSIDE the
 * scroll container so it can stick to the right edge while staying in sync
 * with the scrollable content. Each tick is clickable to jump to that match.
 */
export function MatchScrollbarOverlay({
  positions,
  activeIndex,
  onTickClick,
  topOffset = 0,
}: {
  positions: number[]; // 0..1 fractional Y positions, -1 = unknown
  activeIndex: number;
  onTickClick: (idx: number) => void;
  topOffset?: number;
}) {
  return (
    // sticky pins this to the right edge of the scroll container's viewport.
    // float-right + negative margin removes it from layout flow so it overlays
    // the JSON tree instead of pushing it.
    <div
      className="pointer-events-none sticky float-right z-20"
      style={{
        top: topOffset,
        right: 0,
        width: 12,
        height: `calc(100vh - ${topOffset + 80}px)`,
        marginLeft: -12,
        marginTop: -10000, // pull up out of flow so it overlays the content above
        marginBottom: -10000,
      }}
      aria-hidden="true"
    >
      <div className="relative w-full" style={{ height: "100%" }}>
        {positions.map((frac, i) => {
          if (frac < 0 || frac > 1) return null;
          const isActive = i === activeIndex;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onTickClick(i)}
              aria-label={`Jump to match ${i + 1}`}
              className={cn(
                "pointer-events-auto absolute right-0.5 rounded-sm transition-colors",
                isActive ? "bg-primary" : "bg-primary/55 hover:bg-primary/85",
              )}
              style={{
                top: `calc(${frac * 100}% - 1px)`,
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
