import DOMPurify from "dompurify";

/**
 * The tag subset the stored question bank uses. Sanitising against an allow-list
 * (rather than trusting DOMPurify defaults) keeps imported HTML close to the
 * original format and strips anything the editor can't represent.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "sub",
  "sup",
  "span",
  "blockquote",
  "ol",
  "ul",
  "li",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
  "width",
  "height",
  "colspan",
  "rowspan",
  "class",
  "style",
];

/**
 * Clean untrusted HTML (opened JSON files, pasted content) before it reaches the
 * DOM or the editor. `data:` URLs are allowed so embedded images survive.
 */
export function sanitizeHtml(html: string): string {
  const clean = DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    // Allow inline data: images but nothing else script-adjacent.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
  return clean;
}
