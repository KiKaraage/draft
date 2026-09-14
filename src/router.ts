export type Route =
  | { name: "home" }
  | { name: "set"; setId: string }
  | { name: "soal"; setId: string; soalId: string };

export function parsePath(pathname: string): Route {
  const path = pathname.split("/").filter(Boolean);
  if (path[0] === "set" && path[1]) {
    if (path[2] === "soal" && path[3]) {
      return { name: "soal", setId: path[1], soalId: path[3] };
    }
    return { name: "set", setId: path[1] };
  }
  return { name: "home" };
}

export function navigate(path: string): void {
  const next = path.startsWith("/") ? path : `/${path}`;
  if (location.pathname === next) {
    window.dispatchEvent(new PopStateEvent("popstate"));
    return;
  }
  history.pushState(null, "", next);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Route same-origin `<a href="/...">` clicks client-side so links keep their
 * normal affordances (new tab, copy address, middle-click) without a full load.
 */
function onDocumentClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = (event.target as Element | null)?.closest("a");
  const href = anchor?.getAttribute("href");
  if (!anchor || !href || !href.startsWith("/") || href.startsWith("//")) return;
  if (anchor.target && anchor.target !== "_self") return;
  event.preventDefault();
  navigate(href);
}

/** Run `render` on every navigation (and once immediately). */
export function startRouter(render: (route: Route) => void): void {
  const run = () => render(parsePath(location.pathname));
  window.addEventListener("popstate", run);
  document.addEventListener("click", onDocumentClick);
  run();
}
