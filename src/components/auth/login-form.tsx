"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShoppingBasket } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPending(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to sign in.");
      router.replace("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
      setPending(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><ShoppingBasket size={22} /></span><span>Marketline<span className="brand-period">.</span></span></div>
        <div className="login-copy">
          <p className="eyebrow">STORE OPERATIONS</p>
          <h1 id="login-title">Good business<br />starts here.</h1>
          <p className="login-description">Sign in with your staff account to continue to your store.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Work email</label>
          <input id="email" name="email" type="email" autoComplete="username" placeholder="you@yourstore.ng" required />
          <div className="password-label"><label htmlFor="password">Password</label></div>
          <div className="password-field">
            <LockKeyhole size={17} aria-hidden="true" />
            <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required />
            <button className="visibility-button" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
          {message && <p className="form-message" role="alert">{message}</p>}
          <button className="submit-button" type="submit" disabled={pending}><span>{pending ? "Signing in…" : "Sign in securely"}</span><ArrowRight size={18} /></button>
        </form>
        <footer className="login-footer"><span>Protected staff access</span><span className="secure-indicator"><span /> ENCRYPTED SESSION</span></footer>
      </section>
      <aside className="login-aside" aria-label="Store management">
        <div className="aside-topline"><span>BUILT FOR EVERYDAY TRADE</span><span>NG</span></div>
        <div className="aside-content">
          <div className="aside-orbit" aria-hidden="true"><div className="orbit-core"><ShoppingBasket size={42} strokeWidth={1.3} /></div><span className="orbit-dot" /></div>
          <p className="aside-kicker">ONE STORE. ONE CLEAR VIEW.</p>
          <p className="aside-statement">A calmer way to<br /><em>run your market.</em></p>
          <div className="aside-rule" />
          <p className="aside-note">Point of sale, stock and store performance, together in one place.</p>
        </div>
        <div className="aside-bottom"><span>MARKETLINE MANAGEMENT</span><span>01 / 04</span></div>
      </aside>
    </main>
  );
}