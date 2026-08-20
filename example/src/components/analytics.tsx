"use client";

import Script from "next/script";
import siteConfig from "../../site.config.mjs";
import { useConsent } from "@/components/consent";

const provider = siteConfig.analytics?.provider ?? "none";
const id: string = siteConfig.analytics?.id ?? "";

/**
 * Analytics loader, gated on consent.
 *
 * Renders nothing — no script tag, no network request — until the visitor has
 * accepted. Consent is read through the same external store the banner writes
 * to, so accepting starts measurement immediately without a reload and without
 * an effect syncing one piece of state to another.
 *
 * Adding a provider means a case here plus its hosts in `security.cspAllow`.
 * The config gate refuses to build if a provider is enabled without its host
 * allowed, because a CSP-blocked tracker fails silently in production only.
 */
export function Analytics() {
  const consent = useConsent();

  if (consent !== "accepted" || provider === "none" || !id) return null;

  if (provider === "ga4") {
    return (
      <>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`}
        </Script>
      </>
    );
  }

  if (provider === "plausible") {
    // Host is configurable because self-hosted and custom-domain Plausible are
    // common, and both are ways around ad blockers.
    const host = (siteConfig.analytics?.plausibleHost ?? "https://plausible.io").replace(/\/$/, "");
    return <Script src={`${host}/js/script.js`} data-domain={id} strategy="afterInteractive" />;
  }

  return null;
}
