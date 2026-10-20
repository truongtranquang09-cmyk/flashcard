"use client";

import { Button } from "@/components/Button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <h1 className="text-lg font-semibold text-slate-800">
        Đã có lỗi xảy ra
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Vui lòng thử lại. Nếu lỗi vẫn tiếp diễn, hãy kiểm tra kết nối cơ sở
        dữ liệu.
      </p>
      <Button onClick={reset} className="mt-4">
        Thử lại
      </Button>
    </div>
  );
}
