import { AlertTriangle, CheckCircle2, CircleHelp, ExternalLink, MapPin, UserRound } from "lucide-react";
import { AnalysisResponse, Finding } from "../types";

interface Props {
  finding: Finding | null;
  analysis: AnalysisResponse | null;
  onPickFinding: (finding: Finding) => void;
}

export default function ComplianceSidebar({ finding, analysis, onPickFinding }: Props) {
  const profile = analysis?.customerProfile;
  const applicableStandards = (analysis?.applicableStandards ?? []).slice().sort((a, b) => {
    const pageA = a.documentPage ?? Number.MAX_SAFE_INTEGER;
    const pageB = b.documentPage ?? Number.MAX_SAFE_INTEGER;
    if (pageA !== pageB) {
      return pageA - pageB;
    }
    return a.code.localeCompare(b.code);
  });

  if (!finding) {
    return (
      <aside className="h-full rounded-md border border-[#d7e0ea] bg-[#f9fbfe] p-4">
        <h3 className="font-heading text-base font-semibold text-[#1e3552]">Review Panel</h3>
        <div className="mt-3 rounded-md border border-[#d7e0ea] bg-white p-3 text-sm">
          <div className="flex items-center gap-2 text-[#1f4b7a]">
            <UserRound className="h-4 w-4" />
            <span className="font-semibold">Customer Context</span>
          </div>
          <p className="mt-2 text-slate-700">Customer: {profile?.customerName ?? "Not identified"}</p>
          <p className="text-slate-700">Location: {[profile?.city, profile?.country].filter(Boolean).join(", ") || "Not identified"}</p>
          <p className="text-slate-700">Equipment: {profile?.equipmentType ?? "Not identified"}</p>
          <p className="text-slate-700">Date: {profile?.documentDate ?? "Not identified"}</p>
        </div>
        <p className="mt-2 text-sm text-slate-600">Select any highlighted reference in the PDF to inspect compliance status and source links.</p>
      </aside>
    );
  }

  const status = finding.validation.status;
  const Icon = status === "Up-to-date" ? CheckCircle2 : status === "Superseded" ? AlertTriangle : CircleHelp;
  const color = status === "Up-to-date" ? "text-emerald-600" : status === "Superseded" ? "text-rose-600" : "text-amber-600";

  return (
    <aside className="h-full rounded-md border border-[#d7e0ea] bg-[#f9fbfe] p-4">
      <div className="mb-4 rounded-md border border-[#d7e0ea] bg-white p-3 text-sm">
        <div className="flex items-center gap-2 text-[#1f4b7a]">
          <MapPin className="h-4 w-4" />
          <span className="font-semibold">Project Customer Profile</span>
        </div>
        <div className="mt-2 space-y-1 text-slate-700">
          <p>Customer: {profile?.customerName ?? "Not identified"}</p>
          <p>Location: {[profile?.city, profile?.country].filter(Boolean).join(", ") || "Not identified"}</p>
          <p>Equipment: {profile?.equipmentType ?? "Not identified"}</p>
          <p>Date: {profile?.documentDate ?? "Not identified"}</p>
          <p>Project Code: {profile?.projectCode ?? "Not identified"}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Icon className={`h-6 w-6 ${color}`} />
        <h3 className="font-heading text-base font-semibold text-[#1e3552]">{finding.code}</h3>
      </div>

      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="font-semibold text-slate-700">Category</dt>
          <dd className="text-slate-600">{finding.category}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Status</dt>
          <dd className={color}>{status}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Suggested Replacement</dt>
          <dd className="text-slate-600">{finding.validation.suggestedReplacement ?? "No replacement suggested"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Confidence</dt>
          <dd className="text-slate-600">{Math.round(finding.validation.confidence * 100)}%</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Source</dt>
          <dd>
            {finding.validation.sourceUrl ? (
              <a
                href={finding.validation.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-SMSBlue underline"
              >
                Open reference <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="text-slate-600">No source URL available</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-6 rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-700">
        {finding.validation.sourceSnippet ?? "No source snippet available."}
      </div>

      <div className="mt-6 rounded-md border border-[#d7e0ea] bg-white p-3">
        <p className="text-sm font-semibold text-[#1e3552]">Applicable Standards (DB + Internet)</p>
        <div className="mt-2 max-h-44 space-y-2 overflow-auto text-xs">
          {applicableStandards.slice(0, 20).map((item) => {
            const matchedFinding = analysis?.findings.find((f) => f.id === item.matchedFindingId) ?? null;

            return (
            <div key={`${item.code}-${item.sourceType}`} className="rounded border border-[#e4ebf3] bg-[#fbfdff] p-2">
              <p className="font-semibold text-slate-800">{item.code}</p>
              <p className="text-slate-600">{item.relevanceReason}</p>
              <p className="text-[11px] uppercase tracking-wide text-[var(--sms-red)]">{item.sourceType}</p>
              {item.documentPage ? <p className="text-[11px] text-slate-700">Document page: {item.documentPage}</p> : null}
              {matchedFinding ? (
                <button
                  type="button"
                  onClick={() => onPickFinding(matchedFinding)}
                  className="mt-1 inline-block text-[var(--sms-blue)] underline"
                >
                  Go to reference in this document
                </button>
              ) : null}
              {item.sourceUrl ? (
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-[var(--sms-blue)] underline">
                  Open source
                </a>
              ) : null}
            </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
