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
  customerProfile?: {
    customerName: string | null;
    city: string | null;
    country: string | null;
    equipmentType: string | null;
    documentDate: string | null;
    projectCode: string | null;
  };
  applicableStandards?: Array<{
    code: string;
    title: string;
    sourceType: "internal-db" | "internet";
    sourceUrl: string | null;
    relevanceReason: string;
    documentPage: number | null;
    matchedFindingId: string | null;
  }>;
  referenceProfile?: {
    sourceFileName: string;
    trainedAt: string;
    normCodes: string[];
    keywords: string[];
    comments: string[];
  } | null;
}

export interface StandardLibraryItem {
  code: string;
  status: ComplianceStatus;
  source_url: string | null;
  suggested_replacement: string | null;
  updated_at: string;
}

export interface ReferenceTrainingResult {
  ok: boolean;
  profile: {
    sourceFileName: string;
    trainedAt: string;
    normCodes: string[];
    keywords: string[];
    comments: string[];
  };
  summary: {
    normsLearned: number;
    keywordsLearned: number;
    commentsLearned: number;
  };
}
