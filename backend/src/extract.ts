import mammoth from "mammoth";
import pdfParser from "pdf-parse";
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

export async function extractDocument(fileName: string, mimeType: string, buffer: Buffer): Promise<ExtractedDocument> {
  let text = "";

  if (mimeType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf")) {
    const parsed = await (pdfParser as unknown as (data: Buffer) => Promise<{ text: string }>)(buffer);
    text = parsed.text || "";
  } else if (
    mimeType.includes("word") ||
    mimeType.includes("officedocument") ||
    fileName.toLowerCase().endsWith(".docx")
  ) {
    const parsed = await mammoth.extractRawText({ buffer });
    text = parsed.value || "";
  } else {
    throw new Error("Unsupported file type. Only PDF and DOCX are supported.");
  }

  const normalized = text.replace(/\t/g, " ").replace(/\u00a0/g, " ");

  return {
    fileName,
    mimeType,
    text: normalized,
    spans: buildLineSpans(normalized)
  };
}
