import {
  createSet,
  deleteSet,
  duplicateSet,
  listSets,
  parseSetJson,
  type SoalSetRecord,
} from "../store.ts";
import { navigate } from "../router.ts";
import { appBar } from "../header.ts";
import { download, escapeHtml, onAction, setContent } from "../ui.ts";

function fileNameToSetName(fileName: string): string {
  return fileName.replace(/\.json$/i, "");
}

export function homeView(): HTMLElement {
  const root = document.createElement("section");
  root.className = "view view--home";

  const render = () => {
    const sets = listSets();
    setContent(
      root,
      appBar(
        { name: "home" },
        `
          <button type="button" class="btn" data-action="open">Buka JSON</button>
          <button type="button" class="btn btn--primary" data-action="new">Set Soal Baru</button>
          <input type="file" accept="application/json,.json" hidden data-role="file" />
        `,
      ) +
        `
      <main class="shell">
        <table class="table">
          <thead>
            <tr><th>Nama</th><th class="num">Jumlah Soal</th><th class="actions-col">Aksi</th></tr>
          </thead>
          <tbody>${
            sets.length === 0
              ? `<tr><td colspan="3" class="empty">Belum ada set soal. Mulai dengan “Set Soal Baru” atau “Buka JSON”.</td></tr>`
              : sets.map(rowTemplate).join("")
          }</tbody>
        </table>
      </main>
    `,
    );
  };

  const importFile = async (file: File) => {
    try {
      const soal = parseSetJson(JSON.parse(await file.text()));
      const record = createSet(fileNameToSetName(file.name), soal);
      navigate(`/set/${record.id}`);
    } catch (error) {
      window.alert(`Gagal membuka berkas: ${(error as Error).message}`);
    }
  };

  onAction(root, (action, target) => {
    const id = target.dataset.id;
    const set = id ? listSets().find((s) => s.id === id) : undefined;
    switch (action) {
      case "new": {
        const name = window.prompt("Nama set soal:", "Set Baru");
        if (name === null) return;
        navigate(`/set/${createSet(name).id}`);
        break;
      }
      case "open":
        fileInput()?.click();
        break;
      case "buka":
        if (id) navigate(`/set/${id}`);
        break;
      case "duplicate":
        if (id) {
          duplicateSet(id);
          render();
        }
        break;
      case "export":
        if (set) download(`${set.name}.json`, JSON.stringify(set.soal));
        break;
      case "delete":
        if (set && window.confirm(`Hapus set “${set.name}”?`)) {
          deleteSet(set.id);
          render();
        }
        break;
    }
  });

  const fileInput = () => root.querySelector<HTMLInputElement>('[data-role="file"]');

  // Delegated: `render()` replaces the input node, so a direct listener would be lost.
  root.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.dataset.role !== "file") return;
    const file = input.files?.[0];
    if (file) void importFile(file);
    input.value = "";
  });

  render();
  return root;
}

function rowTemplate(set: SoalSetRecord): string {
  return `
    <tr>
      <td><button type="button" class="link" data-action="buka" data-id="${set.id}">${escapeHtml(set.name)}</button></td>
      <td class="num">${set.soal.length}</td>
      <td>
        <button type="button" class="link" data-action="export" data-id="${set.id}">Ekspor</button>
        <button type="button" class="link" data-action="duplicate" data-id="${set.id}">Duplikat</button>
        <button type="button" class="link link--danger" data-action="delete" data-id="${set.id}">Hapus</button>
      </td>
    </tr>
  `;
}
