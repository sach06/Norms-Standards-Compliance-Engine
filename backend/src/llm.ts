import { AzureOpenAI } from "openai";
import { DomainCategory, NormMention } from "./types";

const BASE_REGEX = /\b(?:ISO|DIN|ANSI|IEC|EN|ASTM|BS|ASME|API|NFPA|IEEE)\b(?:\s|[-:\/])*[A-Z0-9\-:.\/]*\d[A-Z0-9\-:.\/]*/gi;
const VALID_NORM_CODE = /^(?:ISO|DIN|ANSI|IEC|EN|ASTM|BS|ASME|API|NFPA|IEEE)\b[\sA-Z0-9\-:.\/]*\d[\sA-Z0-9\-:.\/]*$/i;

function normalizeNormCode(code: string): string {
  return code.replace(/\s+/g, " ").trim();
}

function isValidNormCode(code: string): boolean {
  return VALID_NORM_CODE.test(normalizeNormCode(code));
}

function classifyByContext(context: string): DomainCategory {
  const lowered = context.toLowerCase();

  if (/voltage|amp|wiring|iec|electrical|power/.test(lowered)) {
    return "Electrical";
  }
  if (/torque|bearing|shaft|gear|mechanical|weld/.test(lowered)) {
    return "Mechanical";
  }
  if (/quality|qms|inspection|iso 9001|conformance/.test(lowered)) {
    return "Quality";
  }
  if (/safety|hazard|risk|osha|protective/.test(lowered)) {
    return "Safety";
  }
  return "Engineering";
}

function extractWithRegex(text: string): NormMention[] {
  const mentions: NormMention[] = [];
  let match: RegExpExecArray | null;

  while ((match = BASE_REGEX.exec(text)) !== null) {
    const code = normalizeNormCode(match[0]);
    const start = match.index;
    const end = match.index + code.length;
    const context = text.slice(Math.max(0, start - 120), Math.min(text.length, end + 120));
    const versionMatch = code.match(/(19|20)\d{2}/);

    if (!isValidNormCode(code)) {
      continue;
    }

    mentions.push({
      id: `${code}-${start}`,
      code,
      version: versionMatch?.[0] ?? null,
      category: classifyByContext(context),
      start,
      end,
      context
    });
  }

  return dedupeMentions(mentions);
}

function dedupeMentions(items: NormMention[]): NormMention[] {
  const seen = new Set<string>();
  const deduped: NormMention[] = [];

  for (const item of items) {
    const key = `${item.code}-${item.start}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

async function extractWithAzureOpenAI(text: string): Promise<Array<Pick<NormMention, "code" | "category">>> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.AZURE_OPENAI_MODEL;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2025-01-01-preview";

  if (!apiKey || !endpoint || !deployment) {
    return [];
  }

  const client = new AzureOpenAI({
    apiKey,
    endpoint,
    apiVersion
  });

  const completion = await client.chat.completions.create({
    model: deployment,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
          content:
            "Extract technical standards mentions (ISO/DIN/ANSI/IEC/EN/ASTM/BS/ASME/API/NFPA/IEEE) and classify each as Electrical, Mechanical, Engineering, Quality, or Safety. Return strict JSON: {\"mentions\":[{\"code\":string,\"category\":string}]}."
      },
      {
        role: "user",
        content: text.slice(0, 12000)
      }
    ]
  });

  const payload = completion.choices[0]?.message?.content;
  if (!payload) {
    return [];
  }

  const parsed = JSON.parse(payload) as { mentions?: Array<{ code: string; category: DomainCategory }> };
  return parsed.mentions ?? [];
}

export async function detectNormMentions(text: string): Promise<NormMention[]> {
  const regexMentions = extractWithRegex(text).filter((mention) => isValidNormCode(mention.code));

  try {
    const llmMentions = await extractWithAzureOpenAI(text);
    if (llmMentions.length === 0) {
      return regexMentions;
    }

    const enriched = [...regexMentions];

    for (const item of llmMentions) {
      const normalizedCode = normalizeNormCode(item.code);
      if (!isValidNormCode(normalizedCode)) {
        continue;
      }

      const hit = regexMentions.find((mention) => mention.code.toLowerCase() === normalizedCode.toLowerCase());
      if (hit) {
        hit.category = item.category;
      } else {
        const idx = text.toLowerCase().indexOf(normalizedCode.toLowerCase());
        if (idx >= 0) {
          enriched.push({
            id: `${normalizedCode}-${idx}`,
            code: normalizedCode,
            version: normalizedCode.match(/(19|20)\d{2}/)?.[0] ?? null,
            category: item.category,
            start: idx,
            end: idx + normalizedCode.length,
            context: text.slice(Math.max(0, idx - 120), Math.min(text.length, idx + normalizedCode.length + 120))
          });
        }
      }
    }

    return dedupeMentions(enriched);
  } catch {
    return regexMentions;
  }
}
