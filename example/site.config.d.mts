/**
 * Type declaration for site.config.mjs.
 *
 * Without this, TypeScript infers the config's shape from whatever literal a
 * given project happens to have written. That inference is hostile in two
 * specific ways, both of which produced real compile failures before this file
 * existed:
 *
 *   - an empty array literal infers as `never[]`, so `new Set(blockedCountries)`
 *     becomes `Set<never>` and `.has(someString)` stops compiling on a fresh
 *     install where the list is legitimately empty;
 *   - deleting an optional block (a project with no author, no analytics)
 *     breaks every file that reads it, even though the code already guards for
 *     it being absent.
 *
 * Declaring the interface means consumers are typed against the contract
 * rather than against one project's current contents, so a project can fill in
 * as much or as little as it needs.
 *
 * Ships alongside site.config.mjs — keep the two in step when adding a field.
 */

export interface ContentCollection {
  dir: string;
  route: string;
  required?: string[];
  coverField?: string;
  faq?: { field?: string; min?: number };
  takeaways?: { field?: string; min?: number; max?: number; minWords?: number };
  warn?: {
    titleMaxChars?: number;
    descriptionChars?: [number, number];
    minH2?: number;
    minWords?: number;
    requireInternalLink?: boolean;
    flagLooseQuotes?: boolean;
  };
}

export interface SiteConfig {
  site: {
    name: string;
    description?: string;
    url: string;
    prodHosts?: string[];
    locale?: string;
    defaultOgImage?: string;
  };
  organization?: {
    alternateName?: string[];
    logo?: string;
    email?: string;
    sameAs?: string[];
  };
  author?: {
    name?: string;
    jobTitle?: string;
    url?: string;
    image?: string;
    sameAs?: string[];
  };
  seo?: {
    excludeFromSitemap?: string[];
    noindexRoutes?: string[];
    disallowCrawl?: string[];
  };
  security?: {
    blockedCountries?: string[];
    cspAllow?: {
      script?: string[];
      connect?: string[];
      img?: string[];
      frame?: string[];
      style?: string[];
      font?: string[];
      formAction?: string[];
    };
  };
  analytics?: {
    provider?: "none" | "ga4" | "plausible";
    id?: string;
    plausibleHost?: string;
    consentKey?: string;
  };
  agents?: {
    markdownTwins?: boolean;
    twinSections?: string[];
    note?: string;
  };
  editor?: {
    enabled?: boolean;
    repo?: { owner?: string; name?: string };
  };
  indexnow?: { enabled?: boolean; key?: string };
  /** Index signature so code can look a collection up by name at runtime. */
  content?: Record<string, ContentCollection>;
  links?: { allowUnresolved?: string[]; publicDirs?: string[] };
}

declare const config: SiteConfig;
export default config;
