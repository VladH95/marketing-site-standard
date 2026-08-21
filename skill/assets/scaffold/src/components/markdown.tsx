import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import dimensions from "@/content/image-dimensions.json";

/**
 * Renders a document body. Content is markdown, so something has to turn it
 * into elements — without this the body ships as a wall of plain text, which
 * is a real failure the rest of the standard cannot see: every gate passes, the
 * page returns 200, and the article is unreadable.
 *
 * This is also the only consumer of image-dimensions.json. next/image needs
 * intrinsic width and height to reserve space, and a markdown author has no
 * way to supply them — they write a plain markdown image and nothing more. The build step
 * measures every file up front and this looks the answer up, so a
 * markdown-authored image reserves its space and the page does not jump as it
 * loads. Generating that map and never reading it, which is where this started,
 * is strictly worse than not generating it: the cost with none of the benefit.
 */

const SIZES = dimensions as Record<string, { w: number; h: number }>;

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        img({ src, alt }) {
          const url = typeof src === "string" ? src : "";
          const size = SIZES[url];

          // An image the build never measured — remote, or added without
          // re-running the build. Fall back rather than crashing, and let the
          // browser size it.
          if (!url.startsWith("/") || !size) {
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={url} alt={alt ?? ""} loading="lazy" />;
          }

          return (
            <Image
              src={url}
              alt={alt ?? ""}
              width={size.w}
              height={size.h}
              sizes="(max-width: 768px) 100vw, 720px"
              style={{ width: "100%", height: "auto" }}
            />
          );
        },
        a({ href, children }) {
          const external = typeof href === "string" && /^https?:\/\//.test(href);
          return (
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {children}
            </a>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
