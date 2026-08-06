import { useMemo } from 'react';

const COLORS = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#eab308'];
const PIECE_COUNT = 90;

// A self-contained CSS-driven confetti burst — no external library. Pass a
// changing `burstKey` to replay it (each key mount gets freshly randomized
// pieces and restarts the fall animation).
export default function Confetti({ burstKey }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2.2 + Math.random() * 1.6,
        color: COLORS[i % COLORS.length],
        rotate: 180 + Math.random() * 540,
        drift: (Math.random() - 0.5) * 240,
        size: 6 + Math.random() * 6,
        round: i % 3 === 0,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burstKey]
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="animate-confetti-fall absolute top-[-5%]"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            backgroundColor: p.color,
            borderRadius: p.round ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--confetti-drift': `${p.drift}px`,
            '--confetti-rotate': `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
