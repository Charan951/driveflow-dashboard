import { useEffect } from "react";

const SITE_NAME = "Carzzi";
const DEFAULT_DESCRIPTION =
  "Carzzi brings doorstep car care to you — general service, car wash, tyre and battery replacement booked in a few taps, picked up, serviced by trained professionals, and delivered back.";

function setMetaTag(selector: string, attr: string, attrValue: string, content: string) {
  let tag = document.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, attrValue);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * Sets the document title and description/OG meta tags for the current page.
 * Pass just a title for a quick "<title> | Carzzi" tab label, or add a
 * description for full on-page SEO (used for <meta name="description"> and
 * the og:title/og:description tags search engines & link previews read).
 */
export function useDocumentTitle(title?: string, description?: string) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;

    const desc = description || DEFAULT_DESCRIPTION;
    setMetaTag('meta[name="description"]', "name", "description", desc);
    setMetaTag('meta[property="og:title"]', "property", "og:title", fullTitle);
    setMetaTag('meta[property="og:description"]', "property", "og:description", desc);
  }, [title, description]);
}
