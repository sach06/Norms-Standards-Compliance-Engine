export type ComplianceStatus = "Up-to-date" | "Superseded" | "Unknown";

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

export interface Validation {
  normCode: string;
  status: ComplianceStatus;
  suggestedReplacement: string | null;
  sourceUrl: string | null;
  sourceSnippet: string | null;
  confidence: number;
}

export interface Finding {
  id: string;
  code: string;
  version: string | null;
  category: string;
  start: number;
  end: number;
  context: string;
  validation: Validation;
}

export interface AnalysisResponse {
  documentId: string;
  document: {
    fileName: string;
    mimeType: string;
    text: string;
    spans: TextSpan[];
  };
  findings: Finding[];
}

export interface StandardLibraryItem {
  code: string;
  status: ComplianceStatus;
  source_url: string | null;
  suggested_replacement: string | null;
  updated_at: string;
}
