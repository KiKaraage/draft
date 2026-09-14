import "./style.css";
import { startRouter, type Route } from "./router.ts";
import { homeView } from "./views/home.ts";
import { setView } from "./views/set.ts";
import { soalView } from "./views/soal.ts";

const app = document.querySelector<HTMLDivElement>("#app")!;

function viewFor(route: Route): HTMLElement {
  switch (route.name) {
    case "home":
      return homeView();
    case "set":
      return setView(route.setId);
    case "soal":
      return soalView(route.setId, route.soalId);
  }
}

let current: HTMLElement | undefined;
startRouter((route) => {
  // Let the outgoing view flush pending work (e.g. the soal editor's autosave).
  current?.dispatchEvent(new CustomEvent("view:leave"));
  current = viewFor(route);
  app.replaceChildren(current);
  window.scrollTo(0, 0);
});
