import mammoth from "mammoth";
import { ExtractedDocument, TextSpan } from "./types";

function buildLineSpans(text: string): TextSpan[] {
  const lines = text.split(/\r?\n/);
  const spans: TextSpan[] = [];
  let cursor = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const start = cursor;
    const end = cursor + line.length;

    spans.push({
      id: `line-${i + 1}`,
      start,
      end,
      page: 1,
      line: i + 1,
      bbox: {
        x: 24,
        y: 24 + i * 18,
        width: Math.max(80, line.length * 7),
        height: 16
      }
    });

    cursor = end + 1;
  }

  return spans;
}

async function extractPdfWithPdfJs(buffer: Buffer): Promise<{ text: string; spans: TextSpan[] }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  let fullText = "";
  const spans: TextSpan[] = [];
  let cursor = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{
      str?: string;
      width?: number;
      height?: number;
      transform?: number[];
      hasEOL?: boolean;
    }>;

    let line = 1;

    for (const item of items) {
      const value = (item.str ?? "").trim();
      if (!value) {
        continue;
      }

      const token = `${value}${item.hasEOL ? "\n" : " "}`;
      const start = cursor;
      const end = cursor + token.length;
      const transform = item.transform ?? [1, 0, 0, 1, 0, 0];

      spans.push({
        id: `p${pageNumber}-${line}-${start}`,
        start,
        end,
        page: pageNumber,
        line,
        bbox: {
          x: transform[4] ?? 0,
          y: transform[5] ?? 0,
          width: item.width ?? Math.max(30, value.length * 6),
          height: item.height ?? 12
        }
      });

      fullText += token;
      cursor = end;

      if (item.hasEOL) {
        line += 1;
      }
    }

    if (!fullText.endsWith("\n")) {
      fullText += "\n";
      cursor += 1;
    }
  }

  return { text: fullText, spans };
}

export async function extractDocument(fileName: string, mimeType: string, buffer: Buffer): Promise<ExtractedDocument> {
  let text = "";
  let spans: TextSpan[] = [];

  if (mimeType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf")) {
    const parsed = await extractPdfWithPdfJs(buffer);
    text = parsed.text;
    spans = parsed.spans;
  } else if (
    mimeType.includes("word") ||
    mimeType.includes("officedocument") ||
    fileName.toLowerCase().endsWith(".docx")
  ) {
    const parsed = await mammoth.extractRawText({ buffer });
    text = parsed.value || "";
    spans = buildLineSpans(text);
  } else {
    throw new Error("Unsupported file type. Only PDF and DOCX are supported.");
  }

  const normalized = text.replace(/\t/g, " ").replace(/\u00a0/g, " ");

  return {
    fileName,
    mimeType,
    text: normalized,
    spans
  };
}
