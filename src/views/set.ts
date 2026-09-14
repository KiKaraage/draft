import { JENIS_SOAL_LABEL, KATEGORI_SOAL_LABEL } from "../types.ts";
import type { Soal } from "../types.ts";
import { blankSoal, cloneSoalInto, getSet, saveSet } from "../store.ts";
import { navigate } from "../router.ts";
import { appBar } from "../header.ts";
import { onAction, setContent } from "../ui.ts";
import { sanitizeHtml } from "../sanitize.ts";

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

/** Column/answer visibility toggles, persisted across reloads. */
interface ViewPrefs {
  showJenis: boolean;
  showKategori: boolean;
  showJawaban: boolean;
  showAksi: boolean;
  showAnswers: boolean;
  boldCorrect: boolean;
}

const PREFS_KEY = "soal.viewPrefs.v1";

const DEFAULT_PREFS: ViewPrefs = {
  showJenis: false,
  showKategori: true,
  showJawaban: false,
  showAksi: true,
  showAnswers: false,
  boldCorrect: false,
};

function loadPrefs(): ViewPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<ViewPrefs>) };
  } catch (error) {
    console.error("Gagal membaca preferensi tampilan.", error);
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs: ViewPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function setView(setId: string): HTMLElement {
  const root = document.createElement("section");
  root.className = "view view--set";

  const prefs = loadPrefs();

  const update = (patch: Partial<ViewPrefs>) => {
    Object.assign(prefs, patch);
    savePrefs(prefs);
    render();
  };

  const render = () => {
    const set = getSet(setId);
    if (!set) {
      setContent(
        root,
        appBar({ name: "set", setId }) +
          `<main class="shell"><p class="empty">Set soal tidak ditemukan. <a href="/">Kembali ke beranda</a>.</p></main>`,
      );
      return;
    }

    setContent(
      root,
      appBar(
        { name: "set", setId },
        `<button type="button" class="btn" data-action="rename">Ganti Nama</button>
         <button type="button" class="btn btn--primary" data-action="add">Tambah Soal</button>`,
      ) +
        `
      <main class="shell">
        <header class="view__head">
          <div class="actions">
            <label class="check"><input type="checkbox" data-role="show-jenis" ${prefs.showJenis ? "checked" : ""}/> Kolom Jenis</label>
            <label class="check"><input type="checkbox" data-role="show-kategori" ${prefs.showKategori ? "checked" : ""}/> Kolom Kategori</label>
            <label class="check"><input type="checkbox" data-role="show-answers" ${prefs.showAnswers ? "checked" : ""}/> Tunjukkan Daftar Jawaban</label>
            <label class="check"><input type="checkbox" data-role="show-jawaban" ${prefs.showJawaban ? "checked" : ""}/> Kolom Jawaban</label>
            <label class="check"><input type="checkbox" data-role="show-aksi" ${prefs.showAksi ? "checked" : ""}/> Kolom Aksi</label>
            ${
              prefs.showAnswers
                ? `<label class="check"><input type="checkbox" data-role="bold-correct" ${prefs.boldCorrect ? "checked" : ""}/> Tebalkan Jawaban Benar</label>`
                : ""
            }
          </div>
        </header>
        <table class="table">
          <thead>
            <tr>
              <th class="num">No</th>
              ${prefs.showJenis ? "<th>Jenis</th>" : ""}
              ${prefs.showKategori ? "<th>Kategori</th>" : ""}
              <th>Soal</th>
              ${prefs.showJawaban ? "<th>Jawaban</th>" : ""}
              ${prefs.showAksi ? '<th class="actions-col">Aksi</th>' : ""}
            </tr>
          </thead>
          <tbody>${
            set.soal.length === 0
              ? `<tr><td colspan="${columnCount()}" class="empty">Belum ada soal. Klik “Tambah Soal”.</td></tr>`
              : set.soal.map((soal, index) => rowTemplate(soal, index)).join("")
          }</tbody>
        </table>
      </main>
    `,
    );

    root
      .querySelector<HTMLInputElement>('[data-role="show-jenis"]')
      ?.addEventListener("change", (event) => {
        update({ showJenis: (event.target as HTMLInputElement).checked });
      });
    root
      .querySelector<HTMLInputElement>('[data-role="show-kategori"]')
      ?.addEventListener("change", (event) => {
        update({ showKategori: (event.target as HTMLInputElement).checked });
      });
    root
      .querySelector<HTMLInputElement>('[data-role="show-jawaban"]')
      ?.addEventListener("change", (event) => {
        update({ showJawaban: (event.target as HTMLInputElement).checked });
      });
    root
      .querySelector<HTMLInputElement>('[data-role="show-aksi"]')
      ?.addEventListener("change", (event) => {
        update({ showAksi: (event.target as HTMLInputElement).checked });
      });
    root
      .querySelector<HTMLInputElement>('[data-role="show-answers"]')
      ?.addEventListener("change", (event) => {
        const checked = (event.target as HTMLInputElement).checked;
        update(checked ? { showAnswers: true } : { showAnswers: false, boldCorrect: false });
      });
    root
      .querySelector<HTMLInputElement>('[data-role="bold-correct"]')
      ?.addEventListener("change", (event) => {
        update({ boldCorrect: (event.target as HTMLInputElement).checked });
      });
  };

  function columnCount(): number {
    return (
      2 +
      (prefs.showJenis ? 1 : 0) +
      (prefs.showKategori ? 1 : 0) +
      (prefs.showJawaban ? 1 : 0) +
      (prefs.showAksi ? 1 : 0)
    );
  }

  function rowTemplate(soal: Soal, index: number): string {
    return `
      <tr>
        <td class="num">${index + 1}</td>
        ${prefs.showJenis ? `<td>${JENIS_SOAL_LABEL[soal.jenis_soal]}</td>` : ""}
        ${prefs.showKategori ? `<td>${KATEGORI_SOAL_LABEL[soal.kategori_soal]}</td>` : ""}
        <td class="cell--stem">${stemPreview(soal)}${prefs.showAnswers ? answersTemplate(soal) : ""}</td>
        ${prefs.showJawaban ? `<td class="cell--answer">${correctAnswerLabel(soal)}</td>` : ""}
        ${
          prefs.showAksi
            ? `<td class="actions-col">
          <button type="button" class="link" data-action="edit" data-id="${soal.id_m_soal}">Edit</button>
          <button type="button" class="link" data-action="duplicate" data-id="${soal.id_m_soal}">Duplikat</button>
          <button type="button" class="link link--danger" data-action="delete" data-id="${soal.id_m_soal}">Hapus</button>
        </td>`
            : ""
        }
      </tr>
    `;
  }

  /** Correct option(s) as "A. text"; empty for Uraian. */
  function correctAnswerLabel(soal: Soal): string {
    if (soal.jenis_soal !== "G") return "";
    return soal.data_jawaban
      .map((jawaban, i) => {
        if (jawaban.status !== "B") return null;
        const letter = OPTION_LETTERS[i] ?? String(i + 1);
        const content = sanitizeHtml(jawaban.jawaban) || `<span class="muted">(kosong)</span>`;
        return `${letter}. ${content}`;
      })
      .filter((label): label is string => label !== null)
      .join(", ");
  }

  function stemPreview(soal: Soal): string {
    return sanitizeHtml(soal.soal) || `<span class="muted">(kosong)</span>`;
  }

  function answersTemplate(soal: Soal): string {
    if (soal.jenis_soal !== "G" || soal.data_jawaban.length === 0) {
      return "";
    }
    return `<ol class="answers">${soal.data_jawaban
      .map((jawaban, i) => {
        const letter = OPTION_LETTERS[i] ?? String(i + 1);
        const content = sanitizeHtml(jawaban.jawaban) || `<span class="muted">(kosong)</span>`;
        const inner =
          prefs.boldCorrect && jawaban.status === "B" ? `<strong>${content}</strong>` : content;
        return `<li><span class="letter">${letter}.</span> ${inner}</li>`;
      })
      .join("")}</ol>`;
  }

  onAction(root, (action, target) => {
    const id = target.dataset.id;
    const set = getSet(setId);
    if (!set) return;

    switch (action) {
      case "add": {
        const soal = blankSoal(set.soal);
        set.soal.push(soal);
        saveSet(set);
        navigate(`/set/${setId}/soal/${soal.id_m_soal}`);
        break;
      }
      case "rename": {
        const name = window.prompt("Nama baru:", set.name);
        if (name === null) return;
        set.name = name.trim() || set.name;
        saveSet(set);
        render();
        break;
      }
      case "edit":
        if (id) navigate(`/set/${setId}/soal/${id}`);
        break;
      case "duplicate": {
        const source = set.soal.find((s) => s.id_m_soal === id);
        if (!source) return;
        set.soal.push(cloneSoalInto(set.soal, source));
        saveSet(set);
        render();
        break;
      }
      case "delete": {
        const source = set.soal.find((s) => s.id_m_soal === id);
        if (!source) return;
        if (!window.confirm("Hapus soal ini?")) return;
        set.soal = set.soal.filter((s) => s.id_m_soal !== id);
        saveSet(set);
        render();
        break;
      }
    }
  });

  render();
  return root;
}
