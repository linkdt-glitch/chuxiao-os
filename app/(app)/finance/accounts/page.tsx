import { createFinanceAccountAction } from "@/app/(app)/finance/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFinanceAccounts } from "@/lib/finance/accounts";

export default async function FinanceAccountsPage() {
  const accounts = await getFinanceAccounts();

  return (
    <>
      <PageHeader title="财务账户" description="维护现金、银行、微信、支付宝、PayPal、Stripe 等账户余额。" />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>新增账户</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createFinanceAccountAction} className="space-y-4">
              <div className="space-y-2">
                <Label>账户名称</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-2">
                <Label>账户类型</Label>
                <select name="account_type" defaultValue="bank" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  {["bank","cash","paypal","stripe","amazon","shopify","alipay","wechat","other"].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>币种</Label>
                <Input name="currency" defaultValue="CNY" />
              </div>
              <div className="space-y-2">
                <Label>期初余额</Label>
                <Input name="opening_balance" type="number" step="0.01" defaultValue="0" />
              </div>
              <Button type="submit" className="w-full">创建账户</Button>
            </form>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{account.name}</CardTitle>
                <Badge variant={account.is_active ? "success" : "secondary"}>{account.account_type}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{account.currency} {Number(account.current_balance).toFixed(2)}</div>
                <div className="mt-1 text-sm text-muted-foreground">期初余额 {Number(account.opening_balance).toFixed(2)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
