"use client";

import { useSyncExternalStore } from "react";
import siteConfig from "../../site.config.mjs";

const KEY: string = siteConfig.analytics?.consentKey ?? "cookie-consent";
const EVENT = "consent-change";

export type Consent = "accepted" | "declined";

/**
 * Consent gate. The rule this implements is fixed across projects: nothing
 * that tracks a visitor loads before they say yes. Which tracker runs is the
 * client's choice; whether it waits for consent is not.
 *
 * The stored choice is modelled as an external store rather than as state
 * synced by an effect. It genuinely is one — it lives in localStorage, outside
 * React, and changes from another component. useSyncExternalStore is the
 * React 19 way to read that, and it avoids the setState-inside-useEffect
 * pattern that both lints against and causes a cascading re-render.
 */

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  // Another tab deciding should update this one too.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null; // storage blocked — treat as no consent
  }
}

/** Nothing is known during SSR, and "no consent" is the safe assumption. */
function getServerSnapshot(): Consent | null {
  return null;
}

/** Read the visitor's choice. `null` means they have not decided. */
export function useConsent(): Consent | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setConsent(choice: Consent) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* ignore storage failures — the visitor simply gets asked again */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function ConsentBanner({
  children,
  privacyHref = "/privacy-policy",
}: {
  /** Your own wording. Say plainly what runs — it reads better and converts better. */
  children?: React.ReactNode;
  privacyHref?: string;
}) {
  const consent = useConsent();
  if (consent !== null) return null;

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
          onClick={() => setConsent("accepted")}
          className="flex-1 rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => setConsent("declined")}
          className="flex-1 rounded-full border px-5 py-3 text-sm font-medium"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
