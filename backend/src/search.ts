import { ValidationResult } from "./types";

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

async function searchSerper(query: string, apiKey: string): Promise<SearchHit | null> {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey
    },
    body: JSON.stringify({ q: query, num: 3 })
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as { organic?: Array<{ title?: string; link?: string; snippet?: string }> };
  const first = json.organic?.[0];
  if (!first) {
    return null;
  }

  return { title: first.title, url: first.link, snippet: first.snippet };
}

async function searchTavily(query: string, apiKey: string): Promise<SearchHit | null> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ api_key: apiKey, query, max_results: 3, search_depth: "basic" })
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };

  const first = json.results?.[0];
  if (!first) {
    return null;
  }

  return { title: first.title, url: first.url, snippet: first.content };
}

export async function validateNormOnline(normCode: string): Promise<ValidationResult> {
  const query = `${normCode} standard current version superseded`; 

  try {
    const serperKey = process.env.SERPER_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    let hit: SearchHit | null = null;

    if (serperKey) {
      hit = await searchSerper(query, serperKey);
    }

    if (!hit && tavilyKey) {
      hit = await searchTavily(query, tavilyKey);
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
