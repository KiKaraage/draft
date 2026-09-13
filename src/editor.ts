import Quill from "quill";
import type { Range } from "quill";
import imageCompression, {
  type Options as ImageCompressionOptions,
} from "browser-image-compression";
import compressionLibUrl from "browser-image-compression/dist/browser-image-compression.js?url";
import { sanitizeHtml } from "./sanitize.ts";
import "quill/dist/quill.snow.css";
import "./editor.css";

/** Image types accepted from the clipboard / drag-drop (Quill's uploader filter). */
const IMAGE_MIMETYPES = ["image/png", "image/jpeg", "image/webp"];

const DEFAULT_TOOLBAR = [
  ["bold", "italic", "underline"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link", "clean"],
];

/**
 * Pasted images are re-encoded before they enter the document. WebP at 1280px
 * keeps screenshots legible while cutting size versus a raw PNG — matching the
 * base64 `<img>` already used by the stored question bank.
 */
const DEFAULT_IMAGE_OPTIONS: ImageCompressionOptions = {
  maxWidthOrHeight: 1280,
  maxSizeMB: 0.5,
  initialQuality: 0.8,
  fileType: "image/webp",
  useWebWorker: true,
  // Compression runs in a worker that `importScripts(libURL)`. The library
  // default points at a jsDelivr CDN URL, which breaks offline use; point it at
  // the copy Vite bundles instead.
  libURL: compressionLibUrl,
};

export interface SoalEditorOptions {
  placeholder?: string;
  readOnly?: boolean;
  /** Quill toolbar rows; pass `false` for no toolbar. */
  toolbar?: unknown;
  /** Overrides merged over the default compression settings. */
  image?: ImageCompressionOptions;
  /** Called with the current HTML whenever the content changes. */
  onChange?: (html: string) => void;
}

/**
 * Rich-text editor for a soal `soal` / `jawaban` field.
 *
 * HTML in, HTML out: the value round-trips through Quill's semantic serializer,
 * so what's stored is a small tag subset (`<p>`, `<strong>`, `<img>`, …) like the
 * existing bank. Pasted or dropped images are compressed to base64 data URLs.
 */
export class SoalEditor {
  readonly quill: Quill;
  private readonly imageOptions: ImageCompressionOptions;

  constructor(container: HTMLElement, options: SoalEditorOptions = {}) {
    this.imageOptions = { ...DEFAULT_IMAGE_OPTIONS, ...options.image };

    this.quill = new Quill(container, {
      theme: "snow",
      placeholder: options.placeholder ?? "",
      readOnly: options.readOnly ?? false,
      modules: {
        toolbar: options.toolbar ?? DEFAULT_TOOLBAR,
        uploader: {
          mimetypes: IMAGE_MIMETYPES,
          handler: (range: Range, files: File[]) => {
            void this.insertImages(files, range);
          },
        },
      },
    });

    if (options.onChange) {
      const onChange = options.onChange;
      this.quill.on("text-change", () => onChange(this.html));
    }
  }

  /** Current content as semantic HTML. */
  get html(): string {
    return this.quill.getSemanticHTML();
  }

  set html(value: string) {
    this.setHtml(value);
  }

  get text(): string {
    return this.quill.getText().trim();
  }

  get isEmpty(): boolean {
    return this.text.length === 0;
  }

  /** Replace the whole content with `html` (sanitised). */
  setHtml(html: string): void {
    this.quill.setContents([]);
    this.quill.clipboard.dangerouslyPasteHTML(sanitizeHtml(html));
  }

  focus(): void {
    this.quill.focus();
  }

  /**
   * Compress and insert images at `range` (defaults to the current selection).
   * Used by the paste/drop uploader, and reusable for a file-picker toolbar button.
   */
  async insertImages(files: File[], range?: Range | null): Promise<void> {
    const target = range ?? this.quill.getSelection(true);
    if (!target) return;

    const images = await Promise.all(files.map((file) => this.toDataUrl(file)));
    const usable = images.filter((url): url is string => url !== null);
    usable.forEach((url, offset) => {
      this.quill.insertEmbed(target.index + offset, "image", url, "user");
    });
    if (usable.length > 0) {
      this.quill.setSelection(target.index + usable.length, "silent");
    }
  }

  private async toDataUrl(file: File): Promise<string | null> {
    let optimized = file;
    try {
      optimized = await imageCompression(file, this.imageOptions);
    } catch (error) {
      console.warn("Kompresi gambar gagal, memakai berkas asli.", error);
    }
    try {
      return await imageCompression.getDataUrlFromFile(optimized);
    } catch (error) {
      console.error("Gagal membaca gambar.", error);
      return null;
    }
  }
}
