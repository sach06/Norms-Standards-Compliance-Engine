import { Download, FileText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import { PDFDocument, rgb } from "pdf-lib";
import { AnalysisResponse, Finding, TextSpan } from "../types";

interface Props {
  file: File | null;
  analysis: AnalysisResponse;
  selectedId: string | null;
  onPick: (finding: Finding) => void;
}

interface HighlightRect {
  finding: Finding;
  span: TextSpan;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function statusClass(status: Finding["validation"]["status"]): string {
  if (status === "Superseded") {
    return "bg-rose-300/60";
  }
  if (status === "Up-to-date") {
    return "bg-emerald-300/55";
  }
  return "bg-amber-300/60";
}

function statusColor(status: Finding["validation"]["status"]): { r: number; g: number; b: number } {
  if (status === "Superseded") {
    return { r: 1, g: 0.4, b: 0.4 };
  }
  if (status === "Up-to-date") {
    return { r: 0.35, g: 0.85, b: 0.55 };
  }
  return { r: 1, g: 0.8, b: 0.35 };
}

export default function PdfComplianceViewer({ file, analysis, selectedId, onPick }: Props) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(880);
  const [pageSizes, setPageSizes] = useState<Record<number, { width: number; height: number }>>({});
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!frameRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width;
      if (nextWidth) {
        setContainerWidth(nextWidth);
      }
    });

    observer.observe(frameRef.current);

    return () => observer.disconnect();
  }, []);

  const highlightsByPage = useMemo(() => {
    const map = new Map<number, HighlightRect[]>();

    for (const finding of analysis.findings) {
      const matchingSpans = analysis.document.spans.filter((span) => overlaps(span.start, span.end, finding.start, finding.end));
      for (const span of matchingSpans) {
        const list = map.get(span.page) ?? [];
        list.push({ finding, span });
        map.set(span.page, list);
      }
    }

    return map;
  }, [analysis]);

  const findingFirstPageMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const finding of analysis.findings) {
      const pages = analysis.document.spans
        .filter((span) => overlaps(span.start, span.end, finding.start, finding.end))
        .map((span) => span.page)
        .sort((a, b) => a - b);

      if (pages[0]) {
        map.set(finding.id, pages[0]);
      }
    }
    return map;
  }, [analysis]);

  useEffect(() => {
    if (!selectedId || !frameRef.current) {
      return;
    }

    const page = findingFirstPageMap.get(selectedId);
    if (!page) {
      return;
    }

    const target = frameRef.current.querySelector(`[data-doc-page=\"${page}\"]`) as HTMLElement | null;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedId, findingFirstPageMap]);

  const renderWidth = Math.max(560, Math.min(980, containerWidth - 32));
  const isPdfFile = Boolean(file && file.name.toLowerCase().endsWith(".pdf"));

  const downloadAnnotatedPdf = async () => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      return;
    }

    setDownloading(true);

    try {
      const sourceBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(sourceBytes);
      const stamped = new Set<string>();

      for (const finding of analysis.findings) {
        const matchingSpans = analysis.document.spans.filter((span) =>
          overlaps(span.start, span.end, finding.start, finding.end)
        );

        const color = statusColor(finding.validation.status);

        for (const span of matchingSpans) {
          const page = pdf.getPage(span.page - 1);
          if (!page) {
            continue;
          }

          const pageHeight = page.getHeight();
          const y = pageHeight - (span.bbox.y + span.bbox.height);

          page.drawRectangle({
            x: span.bbox.x,
            y,
            width: Math.max(16, span.bbox.width),
            height: Math.max(10, span.bbox.height),
            color: rgb(color.r, color.g, color.b),
            opacity: 0.58,
            borderColor: rgb(0.15, 0.2, 0.3),
            borderWidth: 0.35
          });

          const stampKey = `${span.page}-${finding.code}`;
          if (!stamped.has(stampKey)) {
            stamped.add(stampKey);
            page.drawText(finding.code, {
              x: Math.max(10, span.bbox.x - 2),
              y: Math.max(10, y + Math.max(12, span.bbox.height) + 1),
              size: 8,
              color: rgb(0.05, 0.2, 0.42)
            });
          }
        }
      }

      const bytes = await pdf.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name.replace(/\.pdf$/i, "") + "-annotated.pdf";
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#d6dde7] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7edf5] px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[var(--sms-blue)]" />
          <p className="text-sm font-semibold text-slate-700">Document Viewer</p>
          <span className="rounded bg-[var(--sms-blue-soft)] px-2 py-0.5 text-xs font-medium text-[var(--sms-blue)]">{analysis.findings.length} references</span>
        </div>

        <button
          type="button"
          onClick={downloadAnnotatedPdf}
          disabled={downloading || !isPdfFile}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--sms-red)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#b81219] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Preparing PDF..." : "Download Highlighted PDF"}
        </button>
      </div>

      <div
        ref={frameRef}
        className="h-[74vh] overflow-auto bg-[#f2f4f7] p-4"
        onScroll={() => undefined}
      >
        {!isPdfFile && (
          <div className="rounded-md border border-dashed border-[#b7c7da] bg-white p-4 text-sm text-slate-700">
            This file type does not support in-place PDF highlighting. Upload a PDF to get a downloadable highlighted copy.
          </div>
        )}

        {!isPdfFile && (
          <div className="mt-3 space-y-2">
            {analysis.findings.slice(0, 120).map((finding) => (
              <button
                key={finding.id}
                type="button"
                onClick={() => onPick(finding)}
                className="block w-full rounded-md border border-[#d6dde7] bg-white p-3 text-left text-xs hover:bg-[#f8fbff]"
              >
                <div className="font-semibold text-slate-700">{finding.code}</div>
                <div className="mt-1 line-clamp-2 text-slate-600">{finding.context}</div>
              </button>
            ))}
          </div>
        )}

        {isPdfFile && (
        <div className="mx-auto" style={{ width: `${renderWidth + 8}px` }}>
          <Document file={file} onLoadSuccess={(pdf) => setNumPages(pdf.numPages)} loading={<div className="p-4 text-sm">Loading PDF...</div>}>
            {Array.from({ length: numPages }, (_, idx) => {
              const pageNumber = idx + 1;
              const pageHighlights = highlightsByPage.get(pageNumber) ?? [];
              const sourceSize = pageSizes[pageNumber];

              return (
                <div key={pageNumber} data-doc-page={pageNumber} className="relative mb-4 overflow-hidden rounded-md border border-[#d6dde7] bg-white">
                  <Page
                    pageNumber={pageNumber}
                    width={renderWidth}
                    renderTextLayer
                    renderAnnotationLayer
                    onLoadSuccess={(page) => {
                      const [x1, y1, x2, y2] = page.view;
                      setPageSizes((prev) => ({
                        ...prev,
                        [pageNumber]: { width: x2 - x1, height: y2 - y1 }
                      }));
                    }}
                  />

                  {sourceSize &&
                    pageHighlights.map((entry) => {
                      const scale = renderWidth / sourceSize.width;
                      const left = entry.span.bbox.x * scale;
                      const top = (sourceSize.height - (entry.span.bbox.y + entry.span.bbox.height)) * scale;
                      const width = Math.max(14, entry.span.bbox.width * scale);
                      const height = Math.max(10, entry.span.bbox.height * scale);
                      const selected = selectedId === entry.finding.id;

                      return (
                        <button
                          key={`${entry.finding.id}-${entry.span.id}`}
                          type="button"
                          title={`${entry.finding.code} (${entry.finding.validation.status})`}
                          onClick={() => onPick(entry.finding)}
                          className={`absolute ${statusClass(entry.finding.validation.status)} ${
                            selected ? "ring-2 ring-[#1967d2]" : ""
                          }`}
                          style={{ left, top, width, height }}
                        />
                      );
                    })}
                </div>
              );
            })}
          </Document>
        </div>
        )}
      </div>
    </section>
  );
}
