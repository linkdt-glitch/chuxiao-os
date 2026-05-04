"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound, Pencil, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetMemberPasswordAction } from "@/app/(app)/organization/actions";

interface Props {
  memberId: string;
  email?: string | null;
  phone?: string | null;
  isOwner: boolean; // whether the current viewer is Owner
}

export function MemberCredentialCell({ memberId, email, phone, isOwner }: Props) {
  const [editing, setEditing] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("member_id", memberId);
      fd.set("password", password);
      const result = await resetMemberPasswordAction(fd);
      setMessage(result.message);
      setOk(result.ok);
      if (result.ok) {
        setEditing(false);
        setPassword("");
      }
    });
  }

  return (
    <div className="space-y-1 text-xs">
      {email && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Mail className="h-3 w-3 shrink-0" />
          <span className="font-mono">{email}</span>
        </div>
      )}
      {phone && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Phone className="h-3 w-3 shrink-0" />
          <span className="font-mono">{phone}</span>
        </div>
      )}

      {isOwner && (
        <div className="mt-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => { setEditing(true); setMessage(""); }}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-orange-600 hover:bg-orange-50 transition"
            >
              <Pencil className="h-3 w-3" />
              修改密码
            </button>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <div className="relative flex-1">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="新密码（至少12位）"
                    className="h-7 pr-7 text-xs"
                  />
                  <button
                    type="button"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={pending || password.length < 12}
                  onClick={handleSave}
                >
                  <KeyRound className="h-3 w-3" />
                  {pending ? "..." : "保存"}
                </Button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setEditing(false); setMessage(""); setPassword(""); }}
                >
                  取消
                </button>
              </div>
              {message && (
                <p className={`text-[11px] ${ok ? "text-green-600" : "text-red-500"}`}>{message}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
