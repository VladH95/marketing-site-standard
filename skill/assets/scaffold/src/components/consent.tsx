"use client";

import { useEffect, useState } from "react";
import siteConfig from "../../site.config.mjs";

const KEY: string = siteConfig.analytics?.consentKey ?? "cookie-consent";
const EVENT = "consent-change";

export type Consent = "accepted" | "declined";

/**
 * Consent gate. The rule this implements is fixed across projects: nothing
 * that tracks a visitor loads before they say yes. Which tracker runs is the
 * client's choice; whether it waits for consent is not.
 *
 * The choice is stored in localStorage and broadcast as an event, so the
 * analytics loader can start immediately on accept without a page reload.
 * Declining or ignoring the banner loads nothing at all — no script, no
 * cookie, no request.
 */

export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null; // storage disabled — treat as no consent
  }
}

export function onConsent(fn: (c: Consent) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent<Consent>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export function ConsentBanner({
  children,
  privacyHref = "/privacy-policy",
}: {
  /** Your own wording. Say plainly what runs — it reads better and converts better. */
  children?: React.ReactNode;
  privacyHref?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // localStorage is unreadable during render, so the banner's visibility can
    // only be decided after mount.
    if (!readConsent()) setOpen(true);
  }, []);

  function decide(choice: Consent) {
    try {
      localStorage.setItem(KEY, choice);
    } catch {
      /* ignore storage failures — the visitor simply gets asked again */
    }
    window.dispatchEvent(new CustomEvent<Consent>(EVENT, { detail: choice }));
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border bg-white p-6 shadow-lg sm:left-auto sm:w-[380px]"
    >
      <div className="text-sm leading-relaxed">
        {children ?? (
          <p>
            We load one analytics tool, and only if you accept. No ad networks,
            no retargeting.{" "}
            <a href={privacyHref} className="underline underline-offset-2">
              Privacy Policy
            </a>
          </p>
        )}
      </div>
      {/* Both buttons are the same size on purpose. A greyed-out decline is not
          consent under GDPR, and regulators have started saying so. */}
      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={() => decide("accepted")}
          className="flex-1 rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => decide("declined")}
          className="flex-1 rounded-full border px-5 py-3 text-sm font-medium"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
