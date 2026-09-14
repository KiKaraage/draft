/** Escape a string for safe interpolation into an HTML template. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Trigger a client-side file download. */
export function download(filename: string, text: string, type = "application/json"): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Replace an element's children with rendered HTML. */
export function setContent(host: HTMLElement, html: string): void {
  host.replaceChildren(template(html));
}

/** `innerHTML` without the stringly-typed footgun. */
export function template(html: string): DocumentFragment {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  return tpl.content;
}

type ActionHandler = (action: string, target: HTMLElement, event: Event) => void;

/**
 * Delegated click handling for elements carrying `data-action`. Keeps views from
 * attaching a listener per button.
 */
export function onAction(host: HTMLElement, handler: ActionHandler): void {
  host.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target || !host.contains(target)) return;
    handler(target.dataset.action ?? "", target, event);
  });
}
