import KeystaticApp from "./keystatic";

/**
 * The editor takes over this route entirely — no site chrome, no shared
 * layout. Everything under /keystatic is the admin.
 */
export default function Layout() {
  return <KeystaticApp />;
}
