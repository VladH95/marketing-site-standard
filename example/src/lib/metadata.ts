import type { Metadata } from "next";
import siteConfig from "../../site.config.mjs";

const SITE = siteConfig.site.url.replace(/\/$/, "");
const DEFAULT_IMAGE: string = siteConfig.site.defaultOgImage ?? "/og/default.jpg";

/**
 * Per-page metadata, from one helper so no page can quietly ship without a
 * canonical or a share image.
 *
 * The canonical is always the production path — never the preview host and
 * never a bare-domain variant when the site serves www. Two URLs serving the
 * same page split its ranking signals, and the canonical is what merges them
 * back.
 *
 * `metadataBase` is set once in the root layout, which is what lets the
 * relative image paths here resolve to absolute URLs in the emitted tags.
 */
export function pageMetadata(
  path: string,
  opts: {
    title?: string;
    description?: string;
    image?: string;
    type?: "article" | "website";
  } = {}
): Metadata {
  const image = opts.image ?? DEFAULT_IMAGE;
  return {
    ...(opts.title ? { title: opts.title } : {}),
    ...(opts.description ? { description: opts.description } : {}),
    alternates: { canonical: path },
    openGraph: {
      ...(opts.title ? { title: opts.title } : {}),
      ...(opts.description ? { description: opts.description } : {}),
      url: `${SITE}${path === "/" ? "" : path}`,
      siteName: siteConfig.site.name,
      type: opts.type ?? "website",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      ...(opts.title ? { title: opts.title } : {}),
      ...(opts.description ? { description: opts.description } : {}),
      images: [image],
    },
  };
}
