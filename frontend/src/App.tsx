import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { analyzeDocument, fetchReferenceProfile, trainReference } from "./api";
import ComplianceSidebar from "./components/ComplianceSidebar";
import PdfComplianceViewer from "./components/PdfComplianceViewer";
import Uploader from "./components/Uploader";
import { useAuditStore } from "./store";
import smsLogo from "./sms logo.png";

export default function App() {
  const [trainingSummary, setTrainingSummary] = useState<string | null>(null);
  const {
    file,
    analysis,
    selectedFinding,
    loading,
    error,
    setFile,
    setAnalysis,
    setSelectedFinding,
    setLoading,
    setError
  } = useAuditStore();

  useEffect(() => {
    fetchReferenceProfile()
      .then((profile) => {
        if (profile) {
          setTrainingSummary(
            `Reference profile loaded from ${profile.sourceFileName} (${profile.normCodes.length} norms)`
          );
        }
      })
      .catch(() => undefined);
  }, []);

  const runAnalysis = async (input: File) => {
    setFile(input);
    setLoading(true);
    setError(null);

    try {
      const result = await analyzeDocument(input);
      setAnalysis(result);
      setSelectedFinding(result.findings[0] ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const runTraining = async (input: File) => {
    setLoading(true);
    setError(null);

    try {
      const result = await trainReference(input);
      setTrainingSummary(
        `Trained from ${result.profile.sourceFileName}: ${result.summary.normsLearned} norms, ${result.summary.keywordsLearned} keywords`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Training failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6fb] px-3 py-3 font-body text-[#111111] md:px-4">
      <header className="mx-auto mb-3 grid max-w-[1650px] grid-cols-[130px_1fr_420px] items-center rounded-lg border border-[#d7e0ea] bg-white px-4 py-3">
        <div className="flex items-center justify-start">
          <img src={smsLogo} alt="SMS group" className="h-16 w-32 object-contain" />
        </div>

        <div className="text-center">
          <h1 className="font-heading text-xl font-semibold text-[var(--sms-blue)] md:text-2xl">Norms & Standards Compliance Workspace</h1>
        </div>

        <p className="max-w-xl text-right text-xs text-[#2c2c2c] md:text-sm">
          Upload technical specifications, detect standards references, validate status, and download an annotated PDF copy.
        </p>
      </header>

      <main className="mx-auto grid max-w-[1650px] grid-cols-1 gap-3 xl:grid-cols-[300px_1fr_360px]">
        <section className="space-y-3 rounded-lg border border-[#d7e0ea] bg-white p-3">
          <Uploader onSelect={runAnalysis} onTrainReference={runTraining} disabled={loading} />
          <div className="rounded-md border border-[#d7e0ea] bg-[var(--sms-blue-soft)] p-3 text-xs text-[#222]">
            Use Analyze Contract to run extraction and click any applicable standard on the right panel to jump to its page.
          </div>
        </section>

        <section>
          {analysis ? (
            <PdfComplianceViewer
              file={file}
              analysis={analysis}
              selectedId={selectedFinding?.id ?? null}
              onPick={(finding) => setSelectedFinding(finding)}
            />
          ) : (
            <div className="flex h-[74vh] items-center justify-center rounded-lg border border-dashed border-[#c8d4e2] bg-white text-center text-sm text-slate-600">
              Upload a PDF or DOCX to generate standards highlights.
            </div>
          )}
        </section>

        <section className="h-[74vh] overflow-auto rounded-lg border border-[#d7e0ea] bg-white p-3">
          <ComplianceSidebar finding={selectedFinding} analysis={analysis} onPickFinding={setSelectedFinding} />
        </section>
      </main>

      {loading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 backdrop-blur-[1px]">
          <div className="rounded-xl border border-[#d7e0ea] bg-white px-6 py-5 shadow-xl">
            <div className="flex items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--sms-red)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--sms-blue)]">Analyzing Document</p>
                <p className="text-xs text-slate-600">Extracting references, validating standards, and mapping pages...</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {(loading || error || file) && (
        <footer className="mx-auto mt-3 flex max-w-[1650px] items-center gap-3 rounded-lg border border-[#d7e0ea] bg-white px-4 py-2 text-sm">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-SMSBlue" />}
          {loading ? "Analyzing standards references and validating status..." : null}
          {!loading && file ? `Latest file: ${file.name}` : null}
          {!loading && trainingSummary ? trainingSummary : null}
          {error ? <span className="text-rose-700">{error}</span> : null}
        </footer>
      )}
    </div>
  );
}
