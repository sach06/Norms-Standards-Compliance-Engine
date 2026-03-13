export type DomainCategory = "Electrical" | "Mechanical" | "Engineering" | "Quality" | "Safety" | "Uncategorized";

export interface TextSpan {
  id: string;
  start: number;
  end: number;
  page: number;
  line: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ExtractedDocument {
  fileName: string;
  mimeType: string;
  text: string;
  spans: TextSpan[];
}

export interface NormMention {
  id: string;
  code: string;
  version: string | null;
  category: DomainCategory;
  start: number;
  end: number;
  context: string;
}

export interface ValidationResult {
  normCode: string;
  status: "Up-to-date" | "Superseded" | "Unknown";
  suggestedReplacement: string | null;
  sourceUrl: string | null;
  sourceSnippet: string | null;
  confidence: number;
}

export interface ComplianceFinding extends NormMention {
  validation: ValidationResult;
}

export interface CustomerProfile {
  customerName: string | null;
  city: string | null;
  country: string | null;
  equipmentType: string | null;
  documentDate: string | null;
  projectCode: string | null;
}

export interface ApplicableStandard {
  code: string;
  title: string;
  sourceType: "internal-db" | "internet";
  sourceUrl: string | null;
  relevanceReason: string;
  documentPage: number | null;
  matchedFindingId: string | null;
}
