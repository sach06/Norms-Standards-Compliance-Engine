import { StandardLibraryItem } from "../types";

interface Props {
  items: StandardLibraryItem[];
}

export default function StandardsLibrary({ items }: Props) {
  return (
    <section className="rounded-lg border border-[#d7e0ea] bg-[#f8fbff] p-4">
      <h3 className="font-heading text-sm font-semibold text-[#1e3552]">Master Standards Table</h3>
      <div className="mt-3 max-h-56 overflow-auto rounded-md border border-[#d7e0ea] bg-white">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#edf3fb] text-slate-700">
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
