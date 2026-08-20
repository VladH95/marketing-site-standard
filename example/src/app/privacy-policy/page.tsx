import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata("/privacy-policy", {
  title: "Privacy policy",
  description:
    "What this example site collects, which is nothing, and what a real policy on this page would need to cover.",
});

export default function PrivacyPolicy() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p>
        This example site has no analytics configured and sets no cookies, so
        there is nothing here to disclose. It exists because the consent banner
        links to it, and a link to a page that does not exist is exactly the
        failure the link checker is for.
      </p>
      <p>
        A real policy on this page has to name the analytics provider actually
        in use, the form handler that receives enquiries, how long submissions
        are kept, and who to contact to have them deleted. Those are decisions
        about a specific business, so no template can fill them in.
      </p>
    </>
  );
}
