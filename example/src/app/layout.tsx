import type { Metadata } from "next";
import siteConfig from "../../site.config.mjs";
import { JsonLd, organizationJsonLd } from "@/lib/jsonld";
import { ConsentBanner } from "@/components/consent";
import { Analytics } from "@/components/analytics";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.site.url),
  title: siteConfig.site.name,
  description: siteConfig.site.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={siteConfig.site.locale ?? "en"}>
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <JsonLd data={organizationJsonLd()} />
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem" }}>
          {children}
        </main>
        <ConsentBanner />
        <Analytics />
      </body>
    </html>
  );
}
