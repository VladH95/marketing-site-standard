"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import siteConfig from "../../site.config.mjs";
import { readConsent, onConsent } from "@/components/consent";

const provider = siteConfig.analytics?.provider ?? "none";
const id: string = siteConfig.analytics?.id ?? "";

/**
 * Analytics loader, gated on consent.
 *
 * Renders nothing — no script tag, no network request — until the visitor has
 * accepted. It checks the stored choice on mount and also listens for the
 * consent event, so accepting in the banner starts measurement immediately
 * without a reload.
 *
 * Adding a provider means a case here plus its hosts in `security.cspAllow`.
 * If the script is blocked by the CSP the failure is silent in production,
 * so check the browser console once after wiring a new one up.
 */
export function Analytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (readConsent() === "accepted") {
      setEnabled(true);
      return;
    }
    return onConsent((c) => {
      if (c === "accepted") setEnabled(true);
    });
  }, []);

  if (!enabled || provider === "none" || !id) return null;

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
    return (
      <Script src={`${host}/js/script.js`} data-domain={id} strategy="afterInteractive" />
    );
  }

  return null;
}
