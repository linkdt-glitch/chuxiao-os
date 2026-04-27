import { NextRequest, NextResponse } from "next/server";
import { exportFinanceRecordsExcel } from "@/lib/finance/export";
import type { FinanceExportType } from "@/lib/finance/types";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const exportType = (search.get("type") ?? "all") as FinanceExportType;
  const { buffer, fileName } = await exportFinanceRecordsExcel({
    export_type: exportType,
    date_from: search.get("date_from") ?? undefined,
    date_to: search.get("date_to") ?? undefined
  });

  const encoded = encodeURIComponent(fileName);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store"
    }
  });
}
