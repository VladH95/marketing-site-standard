import { config, fields, collection } from "@keystatic/core";
import siteConfig from "./site.config.mjs";

/**
 * The editor's view of the content model.
 *
 * Why a git-backed editor rather than a CMS: saving here is a commit, so the
 * client's "publish" runs the same pre-commit hook, CI and build gates as ours.
 * They cannot ship a page that fails the content gate — the gate is upstream of
 * their publish, not bypassed by it. A database-backed CMS writes past all of
 * that, which is the whole reason it is not the default here.
 *
 * Two rules for editing this file:
 *
 *   1. Every field must map onto frontmatter the content gate already knows.
 *      A field the gate ignores is a field nobody validates; a gate rule with
 *      no field is an error the client cannot act on. Keep them in step.
 *   2. Write descriptions for a non-technical person. "50–160 characters,
 *      shown in Google results" beats "meta description" — the description is
 *      the only training they get.
 *
 * Storage: `local` reads and writes the working copy, for development.
 * `github` is what the client uses — they sign in with GitHub and each save
 * becomes a commit. Access is GitHub repository write access; Keystatic has no
 * role system of its own, so "can draft but not publish" is not expressible
 * here (see references/client-editing.md).
 */
export default config({
  storage:
    process.env.NODE_ENV === "development"
      ? { kind: "local" }
      : {
          kind: "github",
          // From site.config.mjs, which the config gate validates. Hardcoding
          // it here would mean the gate checks a field nothing reads, and the
          // editor silently commits to the wrong repository — or to none.
          repo: {
            owner: siteConfig.editor?.repo?.owner ?? "",
            name: siteConfig.editor?.repo?.name ?? "",
          },
        },

  ui: { brand: { name: siteConfig.site.name } },

  collections: {
    blog: collection({
      label: "Blog posts",
      slugField: "title",
      path: "src/content/blog/*",
      // Plain .md with YAML frontmatter — the same shape the loader, the gate
      // and the link checker already read. No conversion anywhere.
      format: { contentField: "content", data: "yaml" },
      entryLayout: "content",
      columns: ["title", "date"],
      schema: {
        title: fields.slug({
          name: { label: "Title", validation: { isRequired: true } },
          slug: {
            label: "URL slug",
            description:
              "This becomes the page address. Changing it after publishing breaks the old link and loses its position in Google.",
          },
        }),
        description: fields.text({
          label: "Search description",
          description:
            "Shown in Google results and link previews. Aim for 50–160 characters.",
          multiline: true,
          validation: { isRequired: true, length: { min: 50, max: 170 } },
        }),
        date: fields.date({ label: "Publish date", validation: { isRequired: true } }),
        author: fields.text({ label: "Author", validation: { isRequired: true } }),
        cover: fields.image({
          label: "Cover image",
          directory: "public/images/blog",
          publicPath: "/images/blog/",
          validation: { isRequired: true },
        }),
        // Default true so an accidental save never publishes. The client turns
        // it off deliberately, which is the moment the gates start applying.
        draft: fields.checkbox({
          label: "Draft",
          description: "While ticked, this stays hidden from the site.",
          defaultValue: true,
        }),
        // The lengths here mirror the content gate exactly. Where they drift,
        // the editor lets someone save work the build then rejects — and they
        // get a failed deploy instead of a red field, with no way to act on it.
        takeaways: fields.array(
          fields.text({ label: "Takeaway", validation: { isRequired: true } }),
          {
            label: "Key takeaways",
            description:
              "Three to five short, specific lines. These are what AI assistants quote.",
            itemLabel: (props) => props.value || "Takeaway",
            validation: { length: { min: 3, max: 5 } },
          }
        ),
        faq: fields.array(
          fields.object({
            question: fields.text({ label: "Question", validation: { isRequired: true } }),
            answer: fields.text({
              label: "Answer",
              multiline: true,
              validation: { isRequired: true },
            }),
          }),
          {
            label: "FAQ",
            description:
              "At least three. These power the question-and-answer block Google and AI assistants quote.",
            itemLabel: (props) => props.fields.question.value || "Question",
            validation: { length: { min: 3 } },
          }
        ),
        content: fields.markdoc({ label: "Body", extension: "md" }),
      },
    }),

    // Add one block per collection in site.config.mjs. Keep the fields and the
    // gate's `required` list in step — see references/client-editing.md.
  },
});
