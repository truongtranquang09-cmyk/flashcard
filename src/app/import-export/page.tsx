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
          Sao lưu dữ liệu hoặc thêm deck và thẻ từ file JSON / Excel.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-800">Export</h2>
        <p className="text-sm text-slate-500">
          Tải xuống JSON và Tải xuống Excel đều là file ZIP, mỗi deck một file.
          Tiến độ ôn tập không được đưa vào file.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/export"
            download="flashcard-web-json.zip"
            className={buttonClass()}
          >
            Tải xuống JSON
          </a>
          <a
            href="/api/export-excel"
            download="flashcard-web-excel.zip"
            className={buttonClass("excel")}
          >
            Tải xuống Excel
          </a>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-800">Import</h2>
        <p className="text-sm text-slate-500">
          Mỗi deck trong file sẽ được thêm thành một deck mới. Mỗi file tối đa
          5MB, tổng tối đa 20MB.
        </p>
        <p className="text-sm text-slate-500">
          Có thể chọn nhiều file cùng lúc. Nếu tải ZIP, hãy giải nén rồi chọn
          các file bên trong.
        </p>
        <p className="text-sm text-slate-500">
          Tên deck đã tồn tại hoặc front trùng trong cùng một deck sẽ bị từ chối
          cả lần import.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">Từ JSON</h3>
            <ImportForm format="json" />
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Từ Excel (.xlsx)
            </h3>
            <p className="text-xs text-slate-500">
              File Excel dùng cột front, reading, back, example, exampleVi, mỗi
              sheet là một deck.
            </p>
            <ImportForm format="excel" />
          </div>
        </div>
      </section>
    </div>
  );
}
