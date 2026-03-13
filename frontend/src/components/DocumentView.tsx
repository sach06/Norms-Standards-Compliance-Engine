import { Fragment, useMemo } from "react";
import { AnalysisResponse, Finding } from "../types";

interface Props {
  analysis: AnalysisResponse;
  selectedId: string | null;
  onPick: (finding: Finding) => void;
}

interface Segment {
  text: string;
  finding: Finding | null;
}

function buildSegments(text: string, findings: Finding[]): Segment[] {
  const sorted = [...findings].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const finding of sorted) {
    if (cursor < finding.start) {
      segments.push({ text: text.slice(cursor, finding.start), finding: null });
    }
    segments.push({ text: text.slice(finding.start, finding.end), finding });
    cursor = finding.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), finding: null });
  }

  return segments;
}

export default function DocumentView({ analysis, selectedId, onPick }: Props) {
  const segments = useMemo(() => buildSegments(analysis.document.text, analysis.findings), [analysis]);

  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-semibold text-SMSInk">Interactive Contract View</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {analysis.findings.length} norms found
        </span>
      </div>

      <div className="h-[58vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 font-mono text-sm leading-7 text-slate-700">
        {segments.map((segment, idx) => {
          if (!segment.finding) {
            return <Fragment key={`plain-${idx}`}>{segment.text}</Fragment>;
          }

          const status = segment.finding.validation.status;
          const isSelected = selectedId === segment.finding.id;

          const className =
            status === "Superseded"
              ? "bg-rose-200/80"
              : status === "Up-to-date"
                ? "bg-emerald-200/80"
                : "bg-amber-200/80";

          return (
            <button
              key={segment.finding.id + idx}
              type="button"
              title={`${segment.finding.code} (${status})`}
              onClick={() => onPick(segment.finding!)}
              className={`rounded px-1 py-0.5 font-semibold text-slate-900 transition hover:brightness-95 ${className} ${
                isSelected ? "ring-2 ring-SMSBlue" : ""
              }`}
            >
              {segment.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
