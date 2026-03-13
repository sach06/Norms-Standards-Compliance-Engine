import { ApplicableStandard, CustomerProfile, ValidationResult } from "./types";

interface SearchHit {
  title?: string;
  url?: string;
  snippet?: string;
}

function inferStatus(normCode: string, text: string): ValidationResult {
  const lowered = text.toLowerCase();
  const superseded = /superseded|replaced by|withdrawn|obsolete/.test(lowered);

  const replacementMatch = text.match(/(ISO|DIN|ANSI|IEC|EN|ASTM)\s*[A-Z0-9\-:.\/]+/i);

  return {
    normCode,
    status: superseded ? "Superseded" : "Up-to-date",
    suggestedReplacement: superseded ? replacementMatch?.[0] ?? null : null,
    sourceUrl: null,
    sourceSnippet: text.slice(0, 300),
    confidence: superseded ? 0.72 : 0.62
  };
}

async function searchSerper(query: string, apiKey: string, limit = 3): Promise<SearchHit[] | null> {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey
    },
    body: JSON.stringify({ q: query, num: limit })
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as { organic?: Array<{ title?: string; link?: string; snippet?: string }> };
  const organic = json.organic ?? [];
  if (organic.length === 0) {
    return null;
  }

  return organic.map((item) => ({ title: item.title, url: item.link, snippet: item.snippet }));
}

async function searchTavily(query: string, apiKey: string, limit = 3): Promise<SearchHit[] | null> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ api_key: apiKey, query, max_results: limit, search_depth: "basic" })
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };

  const results = json.results ?? [];
  if (results.length === 0) {
    return null;
  }

  return results.map((item) => ({ title: item.title, url: item.url, snippet: item.content }));
}

export async function validateNormOnline(normCode: string): Promise<ValidationResult> {
  const query = `${normCode} standard current version superseded`; 

  try {
    const serperKey = process.env.SERPER_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    let hit: SearchHit | null = null;

    if (serperKey) {
      hit = (await searchSerper(query, serperKey, 1))?.[0] ?? null;
    }

    if (!hit && tavilyKey) {
      hit = (await searchTavily(query, tavilyKey, 1))?.[0] ?? null;
    }

    if (!hit) {
      return {
        normCode,
        status: "Unknown",
        suggestedReplacement: null,
        sourceUrl: null,
        sourceSnippet: "No search provider configured. Set SERPER_API_KEY or TAVILY_API_KEY.",
        confidence: 0.2
      };
    }

    const mergedText = `${hit.title ?? ""} ${hit.snippet ?? ""}`;
    const inferred = inferStatus(normCode, mergedText);

    return {
      ...inferred,
      sourceUrl: hit.url ?? null,
      sourceSnippet: hit.snippet ?? null
    };
  } catch {
    return {
      normCode,
      status: "Unknown",
      suggestedReplacement: null,
      sourceUrl: null,
      sourceSnippet: "Search failed. Check API keys and network access.",
      confidence: 0.2
    };
  }
}

const APPLICABLE_CODE_PATTERN = /\b(?:ISO|DIN|ANSI|IEC|EN|ASTM|BS|ASME|API|NFPA|IEEE)\b(?:\s|[-:\/])*[A-Z0-9\-:.\/]*\d[A-Z0-9\-:.\/]*/gi;

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, " ").trim();
}

export async function searchApplicableStandardsOnline(profile: CustomerProfile): Promise<ApplicableStandard[]> {
  const city = profile.city ?? "";
  const country = profile.country ?? "";
  const equipment = profile.equipmentType ?? "rebar mill";
  const query = `${equipment} standards codes mandatory ${city} ${country} industrial safety electrical mechanical`;

  const serperKey = process.env.SERPER_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  const hits: SearchHit[] = [];

  if (serperKey) {
    const result = await searchSerper(query, serperKey, 8);
    if (result) {
      hits.push(...result);
    }
  }

  if (hits.length === 0 && tavilyKey) {
    const result = await searchTavily(query, tavilyKey, 8);
    if (result) {
      hits.push(...result);
    }
  }

  const standards = new Map<string, ApplicableStandard>();

  for (const hit of hits) {
    const text = `${hit.title ?? ""} ${hit.snippet ?? ""}`;
    const matches = text.match(APPLICABLE_CODE_PATTERN) ?? [];
    for (const raw of matches) {
      const code = normalizeCode(raw);
      if (!code) {
        continue;
      }

      if (!standards.has(code)) {
        standards.set(code, {
          code,
          title: hit.title ?? code,
          sourceType: "internet",
          sourceUrl: hit.url ?? null,
          relevanceReason: `Detected from web search for ${equipment} in ${city || country || "target region"}`,
          documentPage: null,
          matchedFindingId: null
        });
      }
    }
  }

  return [...standards.values()].slice(0, 20);
}
