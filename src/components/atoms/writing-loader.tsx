// Document loader (ADR 0012): three neutral lines written in turn with a
// violet caret. Decorative: the page around it says what's happening.
export function WritingLoader() {
  return (
    <span aria-hidden="true" className="rt-wl grid w-[140px] gap-2.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="rt-wl-bar block h-2 rounded bg-border-strong"
        />
      ))}
    </span>
  );
}
