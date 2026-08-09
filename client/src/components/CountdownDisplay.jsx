function formatParts(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  return {
    hh: String(Math.floor(s / 3600)).padStart(2, '0'),
    mm: String(Math.floor((s % 3600) / 60)).padStart(2, '0'),
    ss: String(s % 60).padStart(2, '0'),
  };
}

// key={char} remounts a fresh span whenever the digit changes, which
// restarts the CSS fade-in animation (.animate-digit-fade, shared with the
// Poster Unveil countdown) on its own — no flip state/timers needed for a
// plain smooth transition.
function DigitTile({ char, urgent }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-[0.16em] px-[0.16em] py-[0.05em] shadow-[0_0.08em_0.2em_rgba(0,0,0,0.35)] ${
        urgent ? 'animate-urgent-glow bg-red-600' : 'bg-white'
      }`}
    >
      <span
        key={char}
        className={`animate-digit-fade inline-block ${urgent ? 'text-white' : 'text-slate-900'}`}
      >
        {char}
      </span>
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
