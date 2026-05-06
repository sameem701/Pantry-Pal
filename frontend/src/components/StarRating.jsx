import { Star } from 'lucide-react';

/**
 * Renders a 5-star row with partial fill support.
 * e.g. rating=4.3 → 4 full stars + ~30% filled 5th star
 */
export default function StarRating({ rating, size = 13 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(n => {
        const fraction = Math.min(1, Math.max(0, rating - (n - 1)));
        return (
          <span key={n} style={{ position: 'relative', display: 'inline-flex' }}>
            {/* empty star */}
            <Star size={size} color="#ddd" fill="none" />
            {/* partial/full fill overlay */}
            {fraction > 0 && (
              <span style={{
                position: 'absolute', top: 0, left: 0,
                width: `${fraction * 100}%`,
                overflow: 'hidden',
                display: 'flex',
              }}>
                <Star size={size} color="#f57c00" fill="#f57c00" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
