import { AnalysisResponse, ReferenceTrainingResult, StandardLibraryItem } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8081";

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

export async function trainReference(file: File): Promise<ReferenceTrainingResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/compliance/train-reference`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const err = (await response.json()) as { error?: string };
    throw new Error(err.error || "Failed to train reference profile");
  }

  return response.json();
}

export async function fetchReferenceProfile(): Promise<AnalysisResponse["referenceProfile"]> {
  const response = await fetch(`${API_BASE}/api/compliance/reference-profile`);
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { profile: AnalysisResponse["referenceProfile"] };
  return data.profile;
}
