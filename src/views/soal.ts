import { KATEGORI_SOAL_LABEL, PILIHAN_GANDA_OPTION_COUNT } from "../types.ts";
import type { JenisSoal, KategoriSoal, Soal } from "../types.ts";
import { getSet, nextJawabanId, saveSet } from "../store.ts";
import type { Route } from "../router.ts";
import { navigate } from "../router.ts";
import { appBar } from "../header.ts";
import { escapeHtml, onAction, setContent } from "../ui.ts";
import { SoalEditor } from "../editor.ts";

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];
const KATEGORI_ORDER: KategoriSoal[] = ["MD", "SD", "SL"];

function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function notFound(root: HTMLElement, route: Route, message: string): void {
  setContent(
    root,
    appBar(route) +
      `<main class="shell"><p class="empty">${message} <a href="/">Kembali ke beranda</a>.</p></main>`,
  );
}

export function soalView(setId: string, soalId: string): HTMLElement {
  const root = document.createElement("section");
  root.className = "view view--soal";

  const set = getSet(setId);
  const soal = set?.soal.find((s) => s.id_m_soal === soalId);
  if (!set || !soal) {
    notFound(root, { name: "soal", setId, soalId }, "Soal tidak ditemukan.");
    return root;
  }

  // Option ids and the correct answer live outside `soal.data_jawaban` so they
  // survive a round-trip through Uraian (which stores no options). A Pilihan
  // Ganda question therefore always keeps exactly one "B" option.
  let jenis: JenisSoal = soal.jenis_soal;
  let correctIndex = soal.data_jawaban.findIndex((j) => j.status === "B");
  if (correctIndex < 0) correctIndex = 0;
  const baseOptionId = Number(nextJawabanId(set.soal)) || 1;
  const optionIds = Array.from(
    { length: PILIHAN_GANDA_OPTION_COUNT },
    (_, i) => soal.data_jawaban[i]?.id_m_jawaban || String(baseOptionId + i),
  );

  setContent(root, formTemplate(setId, soalId, soal, correctIndex));

  const status = root.querySelector<HTMLElement>('[data-role="status"]')!;
  const optionsField = root.querySelector<HTMLElement>('[data-role="options"]')!;

  // Late-bound: `setHtml` below fires onChange while loading content, before the
  // debounced save exists. It stays a no-op until editors are populated, which
  // also avoids a redundant write on open.
  let scheduleSave: () => void = () => {};

  // Option editors are created once and simply hidden for Uraian, so switching
  // jenis back and forth during a session never discards typed content.
  const stemEditor = new SoalEditor(root.querySelector<HTMLElement>('[data-role="stem"]')!, {
    placeholder: "Tulis pertanyaan di sini…",
    onChange: () => scheduleSave(),
  });
  stemEditor.setHtml(soal.soal);

  const optionEditors = Array.from({ length: PILIHAN_GANDA_OPTION_COUNT }, (_, i) => {
    const host = root.querySelector<HTMLElement>(`[data-role="option-${i}"]`)!;
    const editor = new SoalEditor(host, {
      placeholder: `Pilihan ${OPTION_LETTERS[i]}…`,
      toolbar: false,
      onChange: () => scheduleSave(),
    });
    editor.setHtml(soal.data_jawaban[i]?.jawaban ?? "");
    return editor;
  });

  const showStatus = (text: string) => {
    status.textContent = text;
    window.setTimeout(() => {
      if (status.textContent === text) status.textContent = "";
    }, 1500);
  };

  const currentKategori = (): KategoriSoal =>
    (root.querySelector<HTMLInputElement>('input[name="kategori"]:checked')
      ?.value as KategoriSoal) ?? "SD";

  const syncOptionsVisibility = () => {
    optionsField.hidden = jenis !== "G";
  };

  /** Pull editable state back into `soal` and persist the whole set. */
  const collect = () => {
    soal.soal = stemEditor.html;
    soal.jenis_soal = jenis;
    soal.kategori_soal = currentKategori();
    if (jenis === "G") {
      soal.data_jawaban = optionEditors.map((editor, i) => ({
        id_m_jawaban: optionIds[i],
        jawaban: editor.html,
        id_m_soal: soal.id_m_soal,
        status: i === correctIndex ? "B" : "S",
      }));
      soal.jml_jawaban = String(soal.data_jawaban.length);
    } else {
      soal.data_jawaban = [];
      soal.jml_jawaban = "0";
    }
  };

  const save = () => {
    collect();
    const fresh = getSet(setId);
    if (!fresh) return;
    const idx = fresh.soal.findIndex((s) => s.id_m_soal === soal.id_m_soal);
    if (idx >= 0) fresh.soal[idx] = soal;
    saveSet(fresh);
  };

  scheduleSave = debounce(() => {
    save();
    showStatus("Tersimpan");
  }, 400);

  const revertJenis = () => {
    const radio = root.querySelector<HTMLInputElement>(`input[name="jenis"][value="${jenis}"]`);
    if (radio) radio.checked = true;
  };

  root.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    switch (input.name) {
      case "jenis": {
        const next = input.value as JenisSoal;
        // Discarding options is destructive and only visible after saving, so ask first.
        if (next === "E" && jenis === "G" && optionEditors.some((editor) => !editor.isEmpty)) {
          if (!window.confirm("Mengubah ke Uraian akan menghapus pilihan jawaban. Lanjutkan?")) {
            revertJenis();
            return;
          }
        }
        jenis = next;
        syncOptionsVisibility();
        break;
      }
      case "correct":
        correctIndex = Number(input.value);
        break;
    }
    if (input.name === "jenis" || input.name === "kategori" || input.name === "correct") {
      save();
      showStatus("Tersimpan");
    }
  });

  onAction(root, (action) => {
    if (action === "save") {
      save();
      navigate(`/set/${setId}`);
    }
  });

  // The header breadcrumb navigates away; flush the debounced autosave first.
  root.addEventListener("view:leave", () => save());

  syncOptionsVisibility();
  return root;
}

function formTemplate(setId: string, soalId: string, soal: Soal, correctIndex: number): string {
  const isG = soal.jenis_soal === "G";

  return (
    appBar(
      { name: "soal", setId, soalId },
      `
        <span class="status" data-role="status" aria-live="polite"></span>
        <button type="button" class="btn btn--primary" data-action="save">Simpan</button>
      `,
    ) +
    `
    <main class="shell">

      <div class="form-row">
        <fieldset class="field">
          <legend>Jenis Soal</legend>
          ${radioGroup("jenis", [
            { value: "G", label: "Pilihan Ganda", checked: isG },
            { value: "E", label: "Uraian", checked: !isG },
          ])}
        </fieldset>
        <fieldset class="field">
          <legend>Kategori</legend>
          ${radioGroup(
            "kategori",
            KATEGORI_ORDER.map((k) => ({
              value: k,
              label: KATEGORI_SOAL_LABEL[k],
              checked: soal.kategori_soal === k,
            })),
          )}
        </fieldset>
      </div>

      <fieldset class="field">
        <legend>Pertanyaan</legend>
        <div class="editor" data-role="stem"></div>
      </fieldset>

      <fieldset class="field" data-role="options" ${isG ? "" : "hidden"}>
        <legend>Pilihan Jawaban</legend>
        <p class="hint">Pilih tombol radio di kiri untuk menandai jawaban benar.</p>
        ${Array.from({ length: PILIHAN_GANDA_OPTION_COUNT }, (_, i) =>
          optionTemplate(i, correctIndex === i),
        ).join("")}
      </fieldset>
    </main>
  `
  );
}

function optionTemplate(index: number, correct: boolean): string {
  return `
    <div class="option">
      <label class="option__pick">
        <input type="radio" name="correct" value="${index}" ${correct ? "checked" : ""} />
        <span class="letter">${OPTION_LETTERS[index]}</span>
      </label>
      <div class="editor editor--option" data-role="option-${index}"></div>
    </div>
  `;
}

function radioGroup(
  name: string,
  items: { value: string; label: string; checked: boolean }[],
): string {
  return `<div class="radio-group">${items
    .map(
      (item) => `
      <label class="radio">
        <input type="radio" name="${name}" value="${item.value}" ${item.checked ? "checked" : ""} />
        ${escapeHtml(item.label)}
      </label>`,
    )
    .join("")}</div>`;
}
