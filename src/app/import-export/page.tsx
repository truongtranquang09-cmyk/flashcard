import type { Metadata } from "next";
import { ImportForm } from "@/app/import-export/ImportForm";
import { buttonClass } from "@/components/Button";

export const metadata: Metadata = {
  title: "Import/Export",
};

export default function ImportExportPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Import/Export</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sao lưu dữ liệu hoặc thêm deck và thẻ từ file JSON.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-800">Export</h2>
        <p className="text-sm text-slate-500">
          Tải toàn bộ deck và thẻ về máy dưới dạng JSON. Tiến độ ôn tập không
          được đưa vào file.
        </p>
        <div>
          <a
            href="/api/export"
            download="flashcard-web-export.json"
            className={buttonClass()}
          >
            Tải xuống JSON
          </a>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-800">Import</h2>
        <p className="text-sm text-slate-500">
          Chọn file JSON đúng định dạng export. Mỗi deck trong file sẽ được
          thêm thành một deck mới, tối đa 5MB.
        </p>
        <ImportForm />
      </section>
    </div>
  );
}
