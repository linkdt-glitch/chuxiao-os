import ExcelJS from "exceljs";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { emitEvent } from "@/lib/events";
import { getFinanceRecords } from "@/lib/finance/records";
import { canExportFinance } from "@/lib/finance/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FinanceExportType, FinanceRecord } from "@/lib/finance/types";

function monthTitle(date = new Date()) {
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月`;
}

function monthRange(date = new Date()) {
  return {
    from: new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10),
    to: new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10)
  };
}

function purpose(record: FinanceRecord) {
  return [record.category?.name, record.subcategory?.name].filter(Boolean).join(" / ") || "未分类";
}

function remark(record: FinanceRecord) {
  return [record.project_name, record.payment_method, record.status, record.metadata?.notes].filter(Boolean).join("｜");
}

async function buildWorkbook(input: {
  title: string;
  records: FinanceRecord[];
  exportedBy: string;
  exportType: FinanceExportType;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AI Company OS Finance Center";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("财务流水", {
    views: [{ state: "frozen", ySplit: 2 }]
  });

  const headers = input.exportType === "all"
    ? ["编号", "日期", "类型", "明细", "用途", "数量", "总金额", "经手人", "状态", "备注"]
    : ["编号", "日期", input.exportType === "income" ? "收入明细" : "支出明细", "用途", "数量", "总金额", "经手人", "备注"];

  sheet.mergeCells(1, 1, 1, headers.length);
  const title = sheet.getCell(1, 1);
  title.value = input.title;
  title.font = { bold: true, size: 16 };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 28;

  sheet.addRow(headers);
  const headerRow = sheet.getRow(2);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF2F8" } };
  headerRow.border = { bottom: { style: "thin", color: { argb: "FFCBD5E1" } } };

  input.records.forEach((record, index) => {
    const common = [
      index + 1,
      record.occurred_at,
      record.description,
      purpose(record),
      Number(record.quantity || 1),
      Number(record.amount),
      record.submitter?.display_name ?? "-"
    ];
    const row = input.exportType === "all"
      ? [index + 1, record.occurred_at, record.record_type, record.description, purpose(record), Number(record.quantity || 1), Number(record.amount), record.submitter?.display_name ?? "-", record.status, remark(record)]
      : [...common, remark(record)];
    sheet.addRow(row);
  });

  const amountColumn = input.exportType === "all" ? 7 : 6;
  const totalRow = sheet.addRow([]);
  totalRow.getCell(amountColumn - 1).value = "合计";
  totalRow.getCell(amountColumn).value = input.records.reduce((sum, record) => sum + Number(record.amount), 0);
  totalRow.font = { bold: true };
  totalRow.getCell(amountColumn).numFmt = '#,##0.00';

  const metaRow = sheet.addRow([]);
  metaRow.getCell(1).value = `导出时间：${new Date().toLocaleString("zh-CN")}    导出人：${input.exportedBy}`;
  sheet.mergeCells(metaRow.number, 1, metaRow.number, headers.length);
  metaRow.getCell(1).font = { color: { argb: "FF64748B" } };

  sheet.columns = headers.map((header, index) => ({
    header,
    width: index === 2 || index === 3 ? 24 : index === headers.length - 1 ? 32 : 14
  }));
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return;
    row.alignment = { vertical: "middle", wrapText: true };
    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(amountColumn).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(amountColumn).numFmt = '#,##0.00';
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function recordExport(input: {
  exportType: FinanceExportType;
  title: string;
  fileName: string;
  dateFrom?: string;
  dateTo?: string;
  records: FinanceRecord[];
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  const total = input.records.reduce((sum, record) => sum + Number(record.amount), 0);

  if (supabase) {
    const { data, error } = await supabase
      .from("finance_exports")
      .insert({
        organization_id: organization.id,
        export_type: input.exportType,
        title: input.title,
        file_name: input.fileName,
        date_from: input.dateFrom,
        date_to: input.dateTo,
        filters: {},
        record_count: input.records.length,
        total_amount: total,
        currency: input.records[0]?.currency ?? "CNY",
        exported_by: member.id
      })
      .select()
      .single();
    if (error) throw error;
    await logAction({ event_key: "finance.exported", action: "export", module: "finance", related_record_type: "finance_export", related_record_id: data.id, after_data: data });
    await emitEvent({ event_key: "finance.exported", module: "finance", payload: { id: data.id, type: input.exportType, count: input.records.length } });
  }
}

export async function exportFinanceRecordsExcel(filters?: {
  export_type?: FinanceExportType;
  date_from?: string;
  date_to?: string;
}) {
  if (!(await canExportFinance())) throw new Error("Missing permission: finance.export");
  const member = await getCurrentMember();
  const exportType = filters?.export_type ?? "all";
  const records = await getFinanceRecords({
    record_type: exportType === "all" ? "all" : exportType,
    date_from: filters?.date_from,
    date_to: filters?.date_to
  });
  const month = monthTitle();
  const title = exportType === "income" ? `${month}公司收入一览表` : exportType === "expense" ? `${month}公司支出一览表` : `${month}公司流水一览表`;
  const baseName = exportType === "income" ? "公司收入一览表" : exportType === "expense" ? "公司支出一览表" : "公司流水一览表";
  const fileName = `${baseName}_${month}.xlsx`;
  const buffer = await buildWorkbook({ title, records, exportedBy: member.display_name, exportType });
  await recordExport({ exportType, title, fileName, dateFrom: filters?.date_from, dateTo: filters?.date_to, records });
  return { buffer, fileName };
}

export async function exportMonthlyExpenseExcel(date = new Date()) {
  const range = monthRange(date);
  return exportFinanceRecordsExcel({ export_type: "expense", date_from: range.from, date_to: range.to });
}

export async function exportMonthlyIncomeExcel(date = new Date()) {
  const range = monthRange(date);
  return exportFinanceRecordsExcel({ export_type: "income", date_from: range.from, date_to: range.to });
}
