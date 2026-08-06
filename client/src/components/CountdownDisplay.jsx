import { useEffect, useRef, useState } from 'react';

function formatParts(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  return {
    hh: String(Math.floor(s / 3600)).padStart(2, '0'),
    mm: String(Math.floor((s % 3600) / 60)).padStart(2, '0'),
    ss: String(s % 60).padStart(2, '0'),
  };
}

// A real two-face flip card: the front face holds the outgoing digit, the
// back face is pre-rotated 180° and holds the incoming digit. Rotating the
// card -180° around the horizontal axis reveals the back face right-side up
// exactly as the front face turns away — a proper top-to-bottom cube flip,
// not just a spin of unchanged content. Only fires when this digit's value
// actually changes.
function DigitTile({ char, urgent }) {
  const [displayed, setDisplayed] = useState(char);
  const [incoming, setIncoming] = useState(null);
  const prevChar = useRef(char);

  useEffect(() => {
    if (prevChar.current === char) return;
    prevChar.current = char;
    setIncoming(char);

    const timeout = setTimeout(() => {
      setDisplayed(char);
      setIncoming(null);
    }, 600);

    return () => clearTimeout(timeout);
  }, [char]);

  const flipping = incoming !== null;

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-[0.16em] px-[0.16em] py-[0.05em] shadow-[0_0.08em_0.2em_rgba(0,0,0,0.35)] [perspective:320px] ${
        urgent ? 'animate-urgent-glow bg-red-600' : 'bg-white'
      }`}
    >
      <span
        className={`relative inline-block [transform-style:preserve-3d] ${
          flipping ? 'animate-flip-card' : ''
        } ${urgent ? 'text-white' : 'text-slate-900'}`}
      >
        <span className="inline-block [backface-visibility:hidden]">{displayed}</span>
        {flipping && (
          <span className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden] [transform:rotateX(180deg)]">
            {incoming}
          </span>
        )}
      </span>
      {flipping && (
        <span className="animate-flip-shadow pointer-events-none absolute inset-0 rounded-[0.16em] bg-black" />
      )}
    </span>
  );
}

function TimeGroup({ value, label, urgent, showLabels, labelColor }) {
  return (
    <div className="flex flex-col items-center gap-[0.35em]">
      <div className="flex gap-[0.08em]">
        {value.split('').map((char, i) => (
          <DigitTile key={i} char={char} urgent={urgent} />
        ))}
      </div>
      {showLabels && (
        <span
          className={`text-[0.2em] font-semibold uppercase tracking-[0.2em] ${
            urgent ? 'text-red-500' : labelColor
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

function Colon({ urgent, showLabels }) {
  return (
    <div className="flex flex-col items-center gap-[0.35em]">
      <span className={`text-[0.85em] leading-none ${urgent ? 'text-red-500' : 'opacity-40'}`}>:</span>
      {showLabels && <span className="text-[0.2em] opacity-0 select-none">:</span>}
    </div>
  );
}

export default function CountdownDisplay({
  remainingSeconds,
  urgent,
  size,
  color = 'text-white',
  showLabels = false,
}) {
  const { hh, mm, ss } = formatParts(remainingSeconds);

  return (
    <div
      className={`flex items-start justify-center font-mono font-bold tabular-nums ${size} ${
        urgent ? '' : color
      }`}
    >
      <TimeGroup value={hh} label="Hours" urgent={urgent} showLabels={showLabels} labelColor={color} />
      <Colon urgent={urgent} showLabels={showLabels} />
      <TimeGroup value={mm} label="Minutes" urgent={urgent} showLabels={showLabels} labelColor={color} />
      <Colon urgent={urgent} showLabels={showLabels} />
      <TimeGroup value={ss} label="Seconds" urgent={urgent} showLabels={showLabels} labelColor={color} />
    </div>
  );
}
