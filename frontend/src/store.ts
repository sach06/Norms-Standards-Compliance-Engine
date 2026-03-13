import { create } from "zustand";
import { AnalysisResponse, Finding, StandardLibraryItem } from "./types";

interface AuditState {
  file: File | null;
  analysis: AnalysisResponse | null;
  selectedFinding: Finding | null;
  standardsLibrary: StandardLibraryItem[];
  loading: boolean;
  error: string | null;
  setFile: (file: File | null) => void;
  setAnalysis: (analysis: AnalysisResponse | null) => void;
  setSelectedFinding: (finding: Finding | null) => void;
  setStandardsLibrary: (items: StandardLibraryItem[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuditStore = create<AuditState>((set) => ({
  file: null,
  analysis: null,
  selectedFinding: null,
  standardsLibrary: [],
  loading: false,
  error: null,
  setFile: (file) => set({ file }),
  setAnalysis: (analysis) => set({ analysis }),
  setSelectedFinding: (selectedFinding) => set({ selectedFinding }),
  setStandardsLibrary: (standardsLibrary) => set({ standardsLibrary }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
