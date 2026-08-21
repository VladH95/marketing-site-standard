import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDoc, getSlugs } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";
import { JsonLd, articleJsonLd, faqJsonLd } from "@/lib/jsonld";
import { Markdown } from "@/components/markdown";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSlugs("blog").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc("blog", slug);
  if (!doc) return {};
  return pageMetadata(doc.href, {
    title: doc.data.title,
    description: doc.data.description,
    image: doc.data.cover,
    type: "article",
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc("blog", slug);
  if (!doc) notFound();

  const faq = doc.data.faq ?? [];

  return (
    <article>
      <JsonLd
        data={[
          articleJsonLd({
            title: doc.data.title ?? doc.slug,
            description: doc.data.description,
            path: doc.href,
            image: doc.data.cover,
            date: doc.data.date,
          }),
          ...(faq.length ? [faqJsonLd(faq)] : []),
        ]}
      />
      <h1>{doc.data.title}</h1>
      <p>
        <em>{doc.data.description}</em>
      </p>
      {doc.data.takeaways?.length ? (
        <>
          <h2>Key takeaways</h2>
          <ul>
            {doc.data.takeaways.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </>
      ) : null}
      <Markdown>{doc.body}</Markdown>
      {faq.length ? (
        <>
          <h2>FAQ</h2>
          {faq.map((f) => (
            <div key={f.question}>
              <h3>{f.question}</h3>
              <p>{f.answer}</p>
            </div>
          ))}
        </>
      ) : null}
    </article>
  );
}
