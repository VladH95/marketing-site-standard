/**
 * Caps content at the design's max width and centres it. Only content is
 * capped — backgrounds stay full-bleed on the parent <Section>, which is the
 * distinction that keeps wide colour bands from turning into narrow boxes.
 *
 * Set the max width once here to match the design file, then never think about
 * it again.
 */
export function Container({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1440px] ${className}`}>{children}</div>
  );
}
