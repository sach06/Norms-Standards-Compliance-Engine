interface ReferenceProfile {
  sourceFileName: string;
  trainedAt: string;
  normCodes: string[];
  keywords: string[];
  comments: string[];
}

const NORM_PATTERN = /\b(?:ISO|DIN|ANSI|IEC|EN|ASTM|BS|ASME|API|NFPA|IEEE)\b(?:\s|[-:\/])*[A-Z0-9\-:.\/]*\d[A-Z0-9\-:.\/]*/gi;
const STOP_WORDS = new Set([
  "shall",
  "should",
  "would",
  "their",
  "there",
  "where",
  "which",
  "with",
  "that",
  "this",
  "from",
  "have",
  "been",
  "were",
  "when",
  "such",
  "also",
  "into",
  "only",
  "than",
  "your",
  "very",
  "over",
  "under",
  "must",
  "not",
  "for",
  "and",
  "the"
]);

let profile: ReferenceProfile | null = null;

function normalizeValue(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function intersects(a: [number, number, number, number], b: [number, number, number, number]): boolean {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

function topKeywords(values: string[]): string[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    const tokens = value.toLowerCase().match(/[a-z]{4,}/g) ?? [];
    for (const token of tokens) {
      if (STOP_WORDS.has(token)) {
        continue;
      }
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60)
    .map(([token]) => token);
}

export async function trainReferenceProfile(fileName: string, buffer: Buffer): Promise<ReferenceProfile> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  const foundNorms = new Set<string>();
  const comments: string[] = [];
  const highlightedPhrases: string[] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const annotations = await page.getAnnotations();
    const textContent = await page.getTextContent();
    const textItems = textContent.items as Array<{ str?: string; width?: number; height?: number; transform?: number[] }>;

    for (const annotation of annotations as Array<{ subtype?: string; contents?: string; rect?: number[] }>) {
      const subtype = annotation.subtype ?? "";
      const contents = normalizeValue(annotation.contents ?? "");
      if (contents) {
        comments.push(contents);
      }

      if (!["Highlight", "Underline", "Squiggly", "StrikeOut"].includes(subtype)) {
        continue;
      }

      const rect = annotation.rect;
      if (!rect || rect.length < 4) {
        continue;
      }

      const normalizedRect: [number, number, number, number] = [
        Math.min(rect[0], rect[2]),
        Math.min(rect[1], rect[3]),
        Math.max(rect[0], rect[2]),
        Math.max(rect[1], rect[3])
      ];

      const pieces: string[] = [];
      for (const item of textItems) {
        const text = normalizeValue(item.str ?? "");
        if (!text) {
          continue;
        }

        const transform = item.transform ?? [1, 0, 0, 1, 0, 0];
        const width = item.width ?? Math.max(8, text.length * 4.5);
        const height = item.height ?? 10;
        const itemRect: [number, number, number, number] = [transform[4], transform[5], transform[4] + width, transform[5] + height];

        if (intersects(itemRect, normalizedRect)) {
          pieces.push(text);
        }
      }

      const phrase = normalizeValue(pieces.join(" "));
      if (phrase) {
        highlightedPhrases.push(phrase);
      }
    }

    const pageText = normalizeValue((textItems.map((item) => item.str ?? "").join(" ")).replace(/\s+/g, " "));
    const normMatches = pageText.match(NORM_PATTERN) ?? [];
    for (const match of normMatches) {
      foundNorms.add(normalizeValue(match));
    }
  }

  for (const value of [...comments, ...highlightedPhrases]) {
    const normMatches = value.match(NORM_PATTERN) ?? [];
    for (const match of normMatches) {
      foundNorms.add(normalizeValue(match));
    }
  }

  const keywords = topKeywords([...comments, ...highlightedPhrases]);

  profile = {
    sourceFileName: fileName,
    trainedAt: new Date().toISOString(),
    normCodes: [...foundNorms].sort(),
    keywords,
    comments: comments.slice(0, 120)
  };

  return profile;
}

export function getReferenceProfile(): ReferenceProfile | null {
  return profile;
}

export function scoreReferenceMatch(context: string, code: string): number {
  if (!profile) {
    return 0;
  }

  let score = 0;
  const lowerContext = context.toLowerCase();

  if (profile.normCodes.some((norm) => norm.toLowerCase() === code.toLowerCase())) {
    score += 2;
  }

  for (const token of profile.keywords) {
    if (lowerContext.includes(token)) {
      score += 1;
    }
  }

  return score;
}
