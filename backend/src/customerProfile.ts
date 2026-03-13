import { CustomerProfile } from "./types";

const MONTH_PATTERN = /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}/i;
const PROJECT_CODE_PATTERN = /\b[A-Z]{2}\d{2,}[A-Z]{2,}\d+\b/;
const EQUIPMENT_PATTERN = /\b\d{2,4}\s*kTPY\b[^\n]{0,60}/i;

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function pickCustomer(lines: string[], cityIndex: number): string | null {
  if (cityIndex <= 0) {
    return null;
  }

  for (let i = cityIndex - 1; i >= 0; i -= 1) {
    const candidate = normalize(lines[i]);
    if (!candidate) {
      continue;
    }

    if (/technical|offer|rev\.?|project|long products|equipment|contact|baghdad|iraq|sms|group|supplier|seller|www\.|\.com|@|italy|germany|austria|spain|france|europe/i.test(candidate)) {
      continue;
    }

    if (MONTH_PATTERN.test(candidate) || /\d/.test(candidate)) {
      continue;
    }

    if (candidate.length > 2 && candidate.length < 40) {
      return candidate;
    }
  }

  return null;
}

export function extractCustomerProfile(text: string): CustomerProfile {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalize(line))
    .filter((line) => line.length > 0);

  const compactText = normalize(text);

  const locationIdx = lines.findIndex((line) => /baghdad|basra|erbil|najaf|iraq/i.test(line));
  const locationLine = locationIdx >= 0 ? lines[locationIdx] : "";

  let city: string | null = null;
  if (/baghdad/i.test(locationLine)) {
    city = "Baghdad";
  } else if (/basra/i.test(locationLine)) {
    city = "Basra";
  } else if (/erbil/i.test(locationLine)) {
    city = "Erbil";
  } else if (/najaf/i.test(locationLine)) {
    city = "Najaf";
  }

  const country = /iraq/i.test(compactText) ? "Iraq" : null;
  const customerName = pickCustomer(lines, locationIdx);
  const equipmentLine = lines.find((line) => /\bkTPY\b/i.test(line));
  const equipmentType = normalize(equipmentLine ?? compactText.match(EQUIPMENT_PATTERN)?.[0] ?? "") || null;
  const documentDate = compactText.match(MONTH_PATTERN)?.[0] ?? null;
  const projectCode = compactText.match(PROJECT_CODE_PATTERN)?.[0] ?? null;

  return {
    customerName: customerName && !/sms|supplier|seller|group/i.test(customerName) ? customerName : null,
    city,
    country,
    equipmentType,
    documentDate,
    projectCode
  };
}
