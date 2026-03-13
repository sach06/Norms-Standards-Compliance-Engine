import { AlertTriangle, CheckCircle2, CircleHelp, ExternalLink } from "lucide-react";
import { Finding } from "../types";

interface Props {
  finding: Finding | null;
}

export default function ComplianceSidebar({ finding }: Props) {
  if (!finding) {
    return (
      <aside className="h-full rounded-3xl border border-white/70 bg-white/90 p-6 shadow-panel">
        <h3 className="font-heading text-lg font-semibold text-SMSInk">Compliance Sidebar</h3>
        <p className="mt-3 text-sm text-slate-600">Click a highlighted norm in the contract to review status and references.</p>
      </aside>
    );
  }

  const status = finding.validation.status;
  const Icon = status === "Up-to-date" ? CheckCircle2 : status === "Superseded" ? AlertTriangle : CircleHelp;
  const color = status === "Up-to-date" ? "text-emerald-600" : status === "Superseded" ? "text-rose-600" : "text-amber-600";

  return (
    <aside className="h-full rounded-3xl border border-white/70 bg-white/90 p-6 shadow-panel">
      <div className="flex items-center gap-3">
        <Icon className={`h-6 w-6 ${color}`} />
        <h3 className="font-heading text-lg font-semibold text-SMSInk">{finding.code}</h3>
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
    </aside>
  );
}
