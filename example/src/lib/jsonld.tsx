import siteConfig from "../../site.config.mjs";
import type { FaqItem } from "@/lib/content";

export const SITE = siteConfig.site.url.replace(/\/$/, "");
const ORG_ID = `${SITE}/#organization`;

const abs = (u?: string) =>
  !u ? undefined : u.startsWith("http") ? u : `${SITE}${u}`;

/**
 * Serialize JSON-LD for inlining in a <script> tag.
 *
 * JSON.stringify does not escape <, >, & or the line/paragraph separators
 * (U+2028/U+2029), so a "</script>" appearing inside any content field would
 * close the block early and turn the rest of the page into executable markup.
 * Escaping them to \uXXXX keeps the JSON valid and closes that hole. This is
 * the compensating control for the CSP still allowing 'unsafe-inline'.
 */
function safeJsonLd(d: object): string {
  return JSON.stringify(d).replace(/[<>&\u2028\u2029]/g, (c) =>
    "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")
  );
}

/** Renders one or more JSON-LD blocks. */
export function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(d) }}
        />
      ))}
    </>
  );
}

/**
 * Organization + WebSite, emitted once site-wide from the root layout.
 *
 * `alternateName` and `sameAs` are the entity-disambiguation payload: without
 * them a search engine treats every spelling of the brand and every profile as
 * separate candidates and consolidates none of them, which is how a company
 * gets outranked on its own name by unrelated businesses.
 */
export function organizationJsonLd(): object[] {
  const org = siteConfig.organization ?? {};
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": ORG_ID,
      name: siteConfig.site.name,
      url: SITE,
      ...(org.alternateName?.length ? { alternateName: org.alternateName } : {}),
      ...(org.logo ? { logo: abs(org.logo) } : {}),
      ...(siteConfig.site.description ? { description: siteConfig.site.description } : {}),
      ...(org.email ? { email: org.email } : {}),
      ...(org.sameAs?.length ? { sameAs: org.sameAs } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      url: SITE,
      name: siteConfig.site.name,
      publisher: { "@id": ORG_ID },
    },
  ];
}

/** The site author as a Person node. A named, credentialed author carries far
 *  more E-E-A-T weight than a faceless brand byline. */
export function authorNode(): object | undefined {
  const a = siteConfig.author;
  if (!a?.name) return undefined;
  return {
    "@type": "Person",
    ...(a.url ? { "@id": `${SITE}${a.url}#person` } : {}),
    name: a.name,
    ...(a.jobTitle ? { jobTitle: a.jobTitle } : {}),
    ...(a.url ? { url: `${SITE}${a.url}` } : {}),
    ...(a.image ? { image: abs(a.image) } : {}),
    worksFor: { "@id": ORG_ID },
    ...(a.sameAs?.length ? { sameAs: a.sameAs } : {}),
  };
}

export function articleJsonLd(a: {
  title: string;
  description?: string;
  path: string;
  image?: string;
  date?: string;
  type?: "Article" | "BlogPosting";
}): object {
  return {
    "@context": "https://schema.org",
    "@type": a.type ?? "Article",
    headline: a.title,
    description: a.description,
    image: abs(a.image),
    datePublished: a.date,
    dateModified: a.date,
    author: authorNode(),
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}${a.path}` },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
}

/** FAQPage — the single most-quoted format in AI answers, which is why the
 *  content gate insists on complete Q&A pairs. */
export function faqJsonLd(faq: FaqItem[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** ItemList for ranked or numbered posts. Tells an answer engine "this page is
 *  a list of N things", which is what gets a list cited rather than skimmed. */
export function itemListJsonLd(name: string, items: string[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it,
    })),
  };
}

/**
 * A product or service offering. Worth emitting on any catalogue page, even
 * when there is no price.
 *
 * On the price: Google's product rich results — the ones that show a price and
 * availability under the link — require one. A "request a quote" catalogue has
 * no price to give, so it does not get those. What it still gets is the search
 * engine understanding the page as a product with a name, an image, a brand
 * and a description, which is what feeds entity understanding and AI answers.
 * That is the honest trade: no price means no price snippet, not no benefit.
 *
 * Pass `contactUrl` for a quote-based listing and it emits an Offer with
 * availability but no price, which is the correct shape for "ask us".
 */
export function productJsonLd(p: {
  name: string;
  description?: string;
  image?: string;
  path: string;
  sku?: string;
  brand?: string;
  /** Omit entirely on a quote-based listing. */
  price?: { amount: number; currency: string };
  contactUrl?: string;
}): object {
  const offer =
    p.price
      ? {
          "@type": "Offer",
          price: p.price.amount,
          priceCurrency: p.price.currency,
          availability: "https://schema.org/InStock",
          url: `${SITE}${p.path}`,
        }
      : p.contactUrl
        ? {
            "@type": "Offer",
            availability: "https://schema.org/InStock",
            url: abs(p.contactUrl),
          }
        : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    ...(p.description ? { description: p.description } : {}),
    ...(p.image ? { image: abs(p.image) } : {}),
    ...(p.sku ? { sku: p.sku } : {}),
    brand: { "@type": "Brand", name: p.brand ?? siteConfig.site.name },
    url: `${SITE}${p.path}`,
    ...(offer ? { offers: offer } : {}),
  };
}
