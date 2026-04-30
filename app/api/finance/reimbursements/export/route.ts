import { NextResponse } from "next/server";
import { buildExpenseReconciliationWorkbook } from "@/lib/finance/expenses";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? undefined;
  const workbook = await buildExpenseReconciliationWorkbook({ month });
  const buffer = await workbook.xlsx.writeBuffer();
  const fileMonth = month ?? new Date().toISOString().slice(0, 7);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="expense-reconciliation-${fileMonth}.xlsx"`
    }
  });
}
