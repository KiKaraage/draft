import type { JenisSoal, KategoriSoal, Soal, SoalSet } from "./types.ts";
import { PILIHAN_GANDA_OPTION_COUNT } from "./types.ts";

/** A question set as persisted locally — one set corresponds to one JSON file. */
export interface SoalSetRecord {
  id: string;
  name: string;
  soal: Soal[];
}

const STORAGE_KEY = "soal.sets.v1";

type Store = SoalSetRecord[];

function read(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Store) : [];
  } catch (error) {
    console.error("Gagal membaca data tersimpan.", error);
    return [];
  }
}

function write(store: Store): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function newSetId(): string {
  return crypto.randomUUID();
}

/** Next numeric `id_m_soal` for a set (ids are strings in the bank). */
export function nextSoalId(soal: Soal[]): string {
  const max = soal.reduce((acc, s) => Math.max(acc, Number.parseInt(s.id_m_soal, 10) || 0), 0);
  return String(max + 1);
}

/** Next numeric `id_m_jawaban`, unique across the whole set. */
export function nextJawabanId(soal: Soal[]): string {
  let max = 0;
  for (const s of soal) {
    for (const j of s.data_jawaban) {
      max = Math.max(max, Number.parseInt(j.id_m_jawaban, 10) || 0);
    }
  }
  return String(max + 1);
}

export function listSets(): SoalSetRecord[] {
  return read();
}

export function getSet(id: string): SoalSetRecord | undefined {
  return read().find((s) => s.id === id);
}

export function saveSet(record: SoalSetRecord): void {
  const store = read();
  const index = store.findIndex((s) => s.id === record.id);
  if (index >= 0) {
    store[index] = record;
  } else {
    store.push(record);
  }
  write(store);
}

export function createSet(name: string, soal: Soal[] = []): SoalSetRecord {
  const record: SoalSetRecord = { id: newSetId(), name: name.trim() || "Set Tanpa Nama", soal };
  saveSet(record);
  return record;
}

export function renameSet(id: string, name: string): void {
  const record = getSet(id);
  if (!record) return;
  record.name = name.trim() || record.name;
  saveSet(record);
}

export function duplicateSet(id: string): SoalSetRecord | undefined {
  const record = getSet(id);
  if (!record) return;
  return createSet(`${record.name} (salinan)`, structuredClone(record.soal));
}

export function deleteSet(id: string): void {
  write(read().filter((s) => s.id !== id));
}

/** Coerce an unknown parsed value into a set of `Soal`, filling required fields. */
export function parseSetJson(input: unknown): Soal[] {
  if (!Array.isArray(input)) {
    throw new Error("Berkas JSON harus berupa larik soal.");
  }
  return input.map((raw) => normalizeSoal(raw as Partial<Soal>));
}

export function normalizeSoal(raw: Partial<Soal>): Soal {
  const jenis: JenisSoal = raw.jenis_soal === "G" ? "G" : "E";
  const kategori: KategoriSoal =
    raw.kategori_soal === "MD" || raw.kategori_soal === "SL" ? raw.kategori_soal : "SD";
  const data_jawaban = Array.isArray(raw.data_jawaban)
    ? raw.data_jawaban.map((j) => ({
        id_m_jawaban: String(j.id_m_jawaban ?? ""),
        jawaban: String(j.jawaban ?? ""),
        id_m_soal: String(j.id_m_soal ?? raw.id_m_soal ?? ""),
        status: j.status === "B" ? ("B" as const) : ("S" as const),
      }))
    : [];
  return {
    id_m_soal: String(raw.id_m_soal ?? ""),
    soal: String(raw.soal ?? ""),
    jenis_soal: jenis,
    jml_jawaban: String(data_jawaban.length),
    urut_soal: null,
    type_file_soal: "",
    file_soal: "",
    status_soal: raw.status_soal ? String(raw.status_soal) : "A",
    kategori_soal: kategori,
    data_jawaban,
  };
}

/** A fresh, empty Pilihan Ganda question (5 options, first one correct). */
export function blankSoal(soal: Soal[]): Soal {
  const id = nextSoalId(soal);
  let jawabanId = Number.parseInt(nextJawabanId(soal), 10);
  const data_jawaban = Array.from({ length: PILIHAN_GANDA_OPTION_COUNT }, (_, i) => ({
    id_m_jawaban: String(jawabanId++),
    jawaban: "",
    id_m_soal: id,
    status: (i === 0 ? "B" : "S") as "B" | "S",
  }));
  return {
    id_m_soal: id,
    soal: "",
    jenis_soal: "G",
    jml_jawaban: String(data_jawaban.length),
    urut_soal: null,
    type_file_soal: "",
    file_soal: "",
    status_soal: "A",
    kategori_soal: "SD",
    data_jawaban,
  };
}

/** Re-number option ids so they stay unique after a duplicate. */
export function cloneSoalInto(soal: Soal[], source: Soal): Soal {
  const copy = structuredClone(source);
  copy.id_m_soal = nextSoalId(soal);
  const start = Number.parseInt(nextJawabanId(soal), 10);
  copy.data_jawaban = copy.data_jawaban.map((j, i) => ({
    ...j,
    id_m_soal: copy.id_m_soal,
    id_m_jawaban: String(start + i),
  }));
  return copy;
}

export type { SoalSet };
