import type { Team } from '../engine/types';

/** Selo do time (placeholder até entrarem as logos reais). */
export function TeamBadge({ team, size = 40 }: { team: Team; size?: number }) {
  const initials = team.shortName.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
  return (
    <div
      className="font-display grid shrink-0 place-items-center rounded-lg font-bold text-black"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, ${team.color}, color-mix(in srgb, ${team.color} 55%, #000))`,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
