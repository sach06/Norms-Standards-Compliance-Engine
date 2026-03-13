import { Upload } from "lucide-react";
import { useRef } from "react";

interface Props {
  onSelect: (file: File) => void;
  onTrainReference: (file: File) => void;
  disabled?: boolean;
}

export default function Uploader({ onSelect, onTrainReference, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const trainRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-lg border border-[#d7e0ea] bg-[var(--sms-blue-soft)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-base font-semibold text-[var(--sms-blue)]">Contract Import</h2>
          <p className="mt-1 text-xs text-slate-600">
            Upload PDF or DOCX to extract and verify standards references.
          </p>
        </div>
        <Upload className="h-5 w-5 text-[var(--sms-blue)]" />
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

      <input
        ref={trainRef}
        className="hidden"
        type="file"
        accept=".pdf,application/pdf"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onTrainReference(file);
          }
        }}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-[var(--sms-blue)] px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-[#052a50] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          Analyze Contract
        </button>

        <button
          type="button"
          className="inline-flex items-center px-1 py-3 text-sm font-semibold text-[var(--sms-blue)] underline underline-offset-4 transition hover:text-[#052a50] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => trainRef.current?.click()}
          disabled={disabled}
        >
          Train From Another Annotated PDF
        </button>
      </div>
    </div>
  );
}
