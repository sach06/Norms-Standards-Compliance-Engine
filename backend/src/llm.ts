import { AzureOpenAI } from "openai";
import { DomainCategory, NormMention } from "./types";

const BASE_REGEX = /(ISO|DIN|ANSI|IEC|EN|ASTM)\s*[A-Z0-9][A-Z0-9\-:.\/]+/gi;

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
    const code = match[0].trim().replace(/\s{2,}/g, " ");
    const start = match.index;
    const end = match.index + code.length;
    const context = text.slice(Math.max(0, start - 120), Math.min(text.length, end + 120));
    const versionMatch = code.match(/(19|20)\d{2}/);

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
          "Extract technical standards mentions (ISO/DIN/ANSI/IEC/EN/ASTM) and classify each as Electrical, Mechanical, Engineering, Quality, or Safety. Return strict JSON: {\"mentions\":[{\"code\":string,\"category\":string}]}."
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
  const regexMentions = extractWithRegex(text);

  try {
    const llmMentions = await extractWithAzureOpenAI(text);
    if (llmMentions.length === 0) {
      return regexMentions;
    }

    const enriched = [...regexMentions];

    for (const item of llmMentions) {
      const hit = regexMentions.find((mention) => mention.code.toLowerCase() === item.code.toLowerCase());
      if (hit) {
        hit.category = item.category;
      } else {
        const idx = text.toLowerCase().indexOf(item.code.toLowerCase());
        if (idx >= 0) {
          enriched.push({
            id: `${item.code}-${idx}`,
            code: item.code,
            version: item.code.match(/(19|20)\d{2}/)?.[0] ?? null,
            category: item.category,
            start: idx,
            end: idx + item.code.length,
            context: text.slice(Math.max(0, idx - 120), Math.min(text.length, idx + item.code.length + 120))
          });
        }
      }
    }

    return dedupeMentions(enriched);
  } catch {
    return regexMentions;
  }
}
