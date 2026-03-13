import { Upload } from "lucide-react";
import { useRef } from "react";

interface Props {
  onSelect: (file: File) => void;
  disabled?: boolean;
}

export default function Uploader({ onSelect, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-3xl border border-white/50 bg-white/80 p-6 shadow-panel backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-SMSInk">Document Ingestion</h2>
          <p className="mt-1 text-sm text-slate-600">
            Upload a PDF or DOCX contract to detect and validate referenced norms.
          </p>
        </div>
        <Upload className="h-6 w-6 text-SMSBlue" />
      </div>

      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onSelect(file);
          }
        }}
      />

      <button
        type="button"
        className="mt-5 inline-flex items-center rounded-xl bg-SMSBlue px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#064f5e] disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        Select Contract
      </button>
    </div>
  );
}
