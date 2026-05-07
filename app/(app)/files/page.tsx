import Link from "next/link";
import { Download, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFiles } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";
import { deleteFileAction, uploadFileAction } from "./actions";

export default async function FilesPage() {
  const files = await getFiles();

  return (
    <>
      <PageHeader
        title="文件中心"
        description="文件只保存基础资产信息；业务关联通过 file_links 多对多扩展。"
      />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>上传文件</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={uploadFileAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">文件</Label>
                <Input id="file" name="file" type="file" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visibility">权限</Label>
                <Input id="visibility" name="visibility" defaultValue="organization" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset_type">资产类型</Label>
                <Input id="asset_type" name="asset_type" placeholder="receipt / contract / project_doc / other" defaultValue="other" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">标签</Label>
                <Input id="tags" name="tags" placeholder="用英文逗号分隔，如 finance,invoice" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">简要说明</Label>
                <Input id="summary" name="summary" placeholder="这份文件的用途或来源" />
              </div>
              <Button type="submit" className="w-full">
                <Upload className="h-4 w-4" />
                上传到 Supabase Storage
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>文件列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>文件</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>权限</TableHead>
                  <TableHead>上传者</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="font-medium">{file.file_name}</div>
                      <div className="text-xs text-muted-foreground">{file.storage_bucket}/{file.storage_path}</div>
                      {file.summary ? <div className="text-xs text-muted-foreground">{file.summary}</div> : null}
                    </TableCell>
                    <TableCell>
                      <div>{file.mime_type}</div>
                      {file.asset_type ? <div className="text-xs text-muted-foreground">{file.asset_type}</div> : null}
                    </TableCell>
                    <TableCell><StatusBadge value={file.visibility} /></TableCell>
                    <TableCell>{file.uploaded_by_type}:{file.uploaded_by}</TableCell>
                    <TableCell>{formatDate(file.created_at)}</TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/api/files/${file.id}`}>
                          <Download className="h-4 w-4" />
                          下载
                        </Link>
                      </Button>
                      <form action={deleteFileAction}>
                        <input type="hidden" name="file_id" value={file.id} />
                        <ConfirmSubmitButton confirmText="删除文件会写入审计日志，并需确认无关键对象依赖。" variant="destructive">
                          删除
                        </ConfirmSubmitButton>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
