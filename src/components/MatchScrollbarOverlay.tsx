import { cn } from "@/lib/utils";

/**
 * A vertical strip of tick marks indicating match positions, designed to be
 * rendered as a sibling of (and absolutely positioned over) a scroll container.
 * Each tick is clickable to jump to that match.
 */
export function MatchScrollbarOverlay({
  positions,
  activeIndex,
  onTickClick,
  topOffset = 0,
  bottomOffset = 0,
}: {
  positions: number[]; // 0..1 fractional Y positions, -1 = unknown
  activeIndex: number;
  onTickClick: (idx: number) => void;
  topOffset?: number;
  bottomOffset?: number;
}) {
  return (
    <div
      className="pointer-events-none absolute right-0 z-20"
      style={{
        top: topOffset,
        bottom: bottomOffset,
        width: 12,
      }}
      aria-hidden="true"
    >
      <div className="relative w-full h-full">
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
