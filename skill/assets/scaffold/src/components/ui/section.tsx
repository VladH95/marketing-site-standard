/**
 * A full-bleed page section: owns the horizontal padding and vertical rhythm
 * so no page hand-rolls its own and drifts half a step off the grid. Wrap the
 * contents in <Container> to cap the width; the background stays full-bleed.
 *
 * `theme` is not decoration. A sticky header that changes colour over
 * different backgrounds needs to know what it is sitting on, and sniffing the
 * colour at runtime works right up until it doesn't — the failure mode being
 * white text on white. Declaring the tone here means the header reads it from
 * the DOM instead of guessing.
 */
export function Section({
  bg = "",
  px = "px-5 lg:px-10",
  py = "py-10",
  className = "",
  theme = "light",
  children,
}: {
  bg?: string;
  px?: string;
  py?: string;
  className?: string;
  /** Background tone, read by the sticky header to pick a readable colour. */
  theme?: "light" | "dark";
  children: React.ReactNode;
}) {
  return (
    <section data-nav-theme={theme} className={`${px} ${py} ${bg} ${className}`}>
      {children}
    </section>
  );
}
