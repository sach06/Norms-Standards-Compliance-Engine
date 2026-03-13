import { StandardLibraryItem } from "../types";

interface Props {
  items: StandardLibraryItem[];
}

export default function StandardsLibrary({ items }: Props) {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-panel">
      <h3 className="font-heading text-lg font-semibold text-SMSInk">Master Standards Table</h3>
      <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Replacement</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.code}-${item.updated_at}`} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-700">{item.code}</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2">{item.suggested_replacement ?? "-"}</td>
                <td className="px-3 py-2">{new Date(item.updated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
