/** "G" = Pilihan Ganda, "E" = Uraian. */
export type JenisSoal = "G" | "E";

/** "MD" = Mudah, "SD" = Sedang, "SL" = Sulit. */
export type KategoriSoal = "MD" | "SD" | "SL";

/** "B" = benar (correct option), "S" = salah. */
export type JawabanStatus = "B" | "S";

/** One answer option. Only present for Pilihan Ganda; Uraian has none. */
export interface Jawaban {
  id_m_jawaban: string;
  /** HTML fragment. */
  jawaban: string;
  id_m_soal: string;
  status: JawabanStatus;
}

export interface Soal {
  id_m_soal: string;
  /** HTML rich text; may embed `<img src="data:…">`. */
  soal: string;
  jenis_soal: JenisSoal;
  /** Serialized option count. Prefer `data_jawaban.length` as source of truth. */
  jml_jawaban: string;
  urut_soal: null;
  type_file_soal: string;
  file_soal: string;
  status_soal: string;
  kategori_soal: KategoriSoal;
  data_jawaban: Jawaban[];
}

/** One exam paper — exactly one JSON file. */
export type SoalSet = Soal[];

export const JENIS_SOAL_LABEL: Record<JenisSoal, string> = {
  G: "Pilihan Ganda",
  E: "Uraian",
};

export const KATEGORI_SOAL_LABEL: Record<KategoriSoal, string> = {
  MD: "Mudah",
  SD: "Sedang",
  SL: "Sulit",
};

/** Number of options shown for a Pilihan Ganda question. */
export const PILIHAN_GANDA_OPTION_COUNT = 5;
