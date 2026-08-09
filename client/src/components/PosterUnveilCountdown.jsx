import { useEffect, useRef, useState } from 'react';

// Flips the whole number as one glyph rather than per-character tiles: an
// unveil duration is seconds-only and short, so it commonly crosses a
// digit-count boundary (10 -> 9) where fixed per-character slots would
// misalign. A single flipping unit sidesteps that entirely. Same two-face
// flip technique as CountdownDisplay's DigitTile (see index.css
// .animate-flip-card) — only the value that actually changes flips.
function FlipNumber({ value }) {
  const [displayed, setDisplayed] = useState(value);
  const [incoming, setIncoming] = useState(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current === value) return;
    prevValue.current = value;
    setIncoming(value);

    const timeout = setTimeout(() => {
      setDisplayed(value);
      setIncoming(null);
    }, 600);

    return () => clearTimeout(timeout);
  }, [value]);

  const flipping = incoming !== null;

  return (
    <span className="relative inline-block [perspective:600px]">
      <span
        className={`poster-unveil-neon-digit relative inline-block [transform-style:preserve-3d] ${
          flipping ? 'animate-flip-card' : ''
        }`}
      >
        <span className="inline-block [backface-visibility:hidden]">{displayed}</span>
        {flipping && (
          <span className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden] [transform:rotateX(180deg)]">
            {incoming}
          </span>
        )}
      </span>
    </span>
  );
}

export default function PosterUnveilCountdown({ seconds, size = 'text-[6rem] sm:text-[9rem] md:text-[12rem]' }) {
  const value = String(Math.max(0, Math.floor(seconds || 0)));

  return (
    <div className={`animate-neon-pulse font-mono font-black leading-none ${size}`}>
      <FlipNumber value={value} />
    </div>
  );
}
