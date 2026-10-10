"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form className="card" action={action}>
      <div
        className="logo"
        style={{ padding: "0 0 18px", display: "flex", gap: 10, alignItems: "center" }}
      >
        <img src="/logo.png" alt="" width={44} height={44} style={{ borderRadius: 10 }} />
        <div>
          <b style={{ display: "block", fontSize: 17 }}>Green Pharm</b>
          <small className="muted">لوحة التحكم</small>
        </div>
      </div>
      <h1 style={{ fontSize: 20 }}>تسجيل الدخول</h1>
      <p className="sub">أدخل كلمة سر المدير.</p>
      {state?.error && (
        <p className="err-msg" role="alert">
          {state.error}
        </p>
      )}
      <div className="field">
        <label htmlFor="pw">كلمة السر</label>
        <input
          id="pw"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          dir="ltr"
        />
      </div>
      <button className="btn pri" style={{ width: "100%" }} disabled={pending}>
        {pending ? "جارٍ الدخول…" : "دخول"}
      </button>
    </form>
  );
}
