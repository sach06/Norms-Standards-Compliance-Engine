import { AnalysisResponse, StandardLibraryItem } from "./types";

const API_BASE = "http://localhost:8080";

export async function analyzeDocument(file: File): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/compliance/analyze`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const err = (await response.json()) as { error?: string };
    throw new Error(err.error || "Failed to analyze document");
  }

  return response.json();
}

export async function fetchStandardsLibrary(): Promise<StandardLibraryItem[]> {
  const response = await fetch(`${API_BASE}/api/standards`);
  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { standards: StandardLibraryItem[] };
  return data.standards ?? [];
}
