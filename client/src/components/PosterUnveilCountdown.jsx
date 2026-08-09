export default function PosterUnveilCountdown({ seconds, size = 'text-[8rem] sm:text-[13rem] md:text-[17rem]' }) {
  const value = String(Math.max(0, Math.floor(seconds || 0)));

  return (
    // h-[1.9em]/w-[1.9em] here (matching the ring below) makes this div's
    // real layout box match its visual footprint. The ring is absolutely
    // positioned and otherwise contributes no size, so a parent laying this
    // out in a flex column with a sibling (e.g. the "Unveiling In" label)
    // would measure only the digit's small inline box and let the ring
    // visually overlap that sibling.
    <div className={`relative flex h-[1.9em] w-[1.9em] items-center justify-center ${size}`}>
      <span className="poster-unveil-ring-glow pointer-events-none absolute h-[1.9em] w-[1.9em] rounded-full" aria-hidden="true" />
      <span className="poster-unveil-ring-spin pointer-events-none absolute h-[1.9em] w-[1.9em] rounded-full" aria-hidden="true" />
      <span className="relative font-mono font-black leading-none">
        {/* key={value} remounts a fresh span on every change, which
            restarts the CSS fade-in animation automatically — no flip
            state/timers needed for a plain smooth transition. */}
        <span key={value} className="poster-unveil-neon-digit animate-digit-fade inline-block">
          {value}
        </span>
      </span>
    </div>
  );
}
