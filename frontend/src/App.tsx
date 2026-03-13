import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { analyzeDocument, fetchStandardsLibrary } from "./api";
import ComplianceSidebar from "./components/ComplianceSidebar";
import DocumentView from "./components/DocumentView";
import StandardsLibrary from "./components/StandardsLibrary";
import Uploader from "./components/Uploader";
import { useAuditStore } from "./store";

export default function App() {
  const {
    file,
    analysis,
    selectedFinding,
    standardsLibrary,
    loading,
    error,
    setFile,
    setAnalysis,
    setSelectedFinding,
    setStandardsLibrary,
    setLoading,
    setError
  } = useAuditStore();

  useEffect(() => {
    fetchStandardsLibrary().then(setStandardsLibrary).catch(() => undefined);
  }, [setStandardsLibrary]);

  const runAnalysis = async (input: File) => {
    setFile(input);
    setLoading(true);
    setError(null);

    try {
      const result = await analyzeDocument(input);
      setAnalysis(result);
      setSelectedFinding(result.findings[0] ?? null);
      const library = await fetchStandardsLibrary();
      setStandardsLibrary(library);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fefae0_0%,_#dceef2_55%,_#bfd7ea_100%)] px-4 py-6 font-body text-slate-900 md:px-8">
      <header className="mx-auto mb-6 max-w-[1400px]">
        <p className="text-sm uppercase tracking-[0.18em] text-SMSBlue">SMS-group</p>
        <h1 className="mt-1 font-heading text-3xl font-bold text-SMSInk md:text-4xl">Norms & Standards Compliance Engine</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700 md:text-base">
          AI-assisted extraction, validation, and audit of ISO, DIN, ANSI and related standards across technical contracts.
        </p>
      </header>

      <main className="mx-auto grid max-w-[1400px] grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr_0.9fr]">
        <section className="space-y-5">
          <Uploader onSelect={runAnalysis} disabled={loading} />
          <StandardsLibrary items={standardsLibrary} />
        </section>

        <section>
          {analysis ? (
            <DocumentView
              analysis={analysis}
              selectedId={selectedFinding?.id ?? null}
              onPick={(finding) => setSelectedFinding(finding)}
            />
          ) : (
            <div className="flex h-[68vh] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-600">
              Upload a contract to render interactive highlights.
            </div>
          )}
        </section>

        <section className="h-[68vh]">
          <ComplianceSidebar finding={selectedFinding} />
        </section>
      </main>

      {(loading || error || file) && (
        <footer className="mx-auto mt-5 flex max-w-[1400px] items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm shadow">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-SMSBlue" />}
          {loading ? "Running extraction + compliance validation..." : null}
          {!loading && file ? `Latest file: ${file.name}` : null}
          {error ? <span className="text-rose-700">{error}</span> : null}
        </footer>
      )}
    </div>
  );
}
