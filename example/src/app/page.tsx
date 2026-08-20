import Link from "next/link";
import { getAllDocs } from "@/lib/content";

export default function Home() {
  const posts = getAllDocs("blog");
  return (
    <>
      <h1>Northwind Studio</h1>
      <p>
        A worked example of the marketing-site-build standard: file-based content,
        machine-enforced gates, generated SEO surfaces.
      </p>
      <h2>Writing</h2>
      <ul>
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={p.href}>{p.data.title}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
