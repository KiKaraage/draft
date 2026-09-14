import type { Route } from "./router.ts";
import { getSet } from "./store.ts";
import { escapeHtml } from "./ui.ts";

const SEP = `<span class="crumb-sep" aria-hidden="true">/</span>`;

/** File-explorer style path: Draft / Set name / Question number. */
function crumbsFor(route: Route): string {
  const trail = [
    `<a class="crumb" href="/"><img class="crumb__icon" src="/favicon.svg" alt="" />Draft</a>`,
  ];
  if (route.name === "home") return trail.join(SEP);

  const set = getSet(route.setId);
  const name = escapeHtml(set?.name ?? "Set Tanpa Nama");
  trail.push(
    route.name === "soal"
      ? `<a class="crumb" href="/set/${escapeHtml(route.setId)}">${name}</a>`
      : `<span class="crumb crumb--current" aria-current="page">${name}</span>`,
  );

  if (route.name === "soal") {
    const order = set?.soal.findIndex((s) => s.id_m_soal === route.soalId) ?? -1;
    const label = order >= 0 ? `Soal ${order + 1}` : "Soal";
    trail.push(`<span class="crumb crumb--current" aria-current="page">${label}</span>`);
  }
  return trail.join(SEP);
}

/**
 * Sticky top bar. Breadcrumbs render on the left, page-level `actions` on the
 * right. It is rendered by each view (not once globally) so the actions stay
 * inside the view's element and keep working with its delegated `onAction`.
 */
export function appBar(route: Route, actions = ""): string {
  return `
    <header class="app-bar">
      <div class="app-bar__inner">
        <nav class="crumbs" aria-label="Breadcrumb">${crumbsFor(route)}</nav>
        <div class="actions">${actions}</div>
      </div>
    </header>
  `;
}
