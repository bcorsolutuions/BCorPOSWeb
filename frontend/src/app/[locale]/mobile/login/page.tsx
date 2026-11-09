"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { AxiosError } from "axios";
import { Eye, EyeOff, Loader2, UtensilsCrossed } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

const USERNAME_KEY = "bcor-waiter-username";

function readSavedUsername(): string {
  try {
    return window.localStorage.getItem(USERNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Waiter Mobile Ordering §4 — reuses the exact same authentication as the
 * desktop login (useAuth/authService.login/AccountController) with a
 * phone-shaped form. No new user/password database or auth logic here.
 *
 * Built for a waiter on the floor: the username is remembered on the phone (the password is never stored), the keyboard
 * doesn't capitalise or autocorrect it, the password can be revealed, and a failed sign-in says what went wrong.
 */
export default function MobileLoginPage() {
  const t = useTranslations("auth");
  const tm = useTranslations("mobileWaiter");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberedUser, setRememberedUser] = useState(false);

  useEffect(() => {
    const saved = readSavedUsername();
    if (saved) {
      setUsername(saved);
      setRememberedUser(true);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(tm("enterBoth"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login({ username: username.trim(), password });
      try {
        window.localStorage.setItem(USERNAME_KEY, username.trim());
      } catch {
        /* private mode - just won't be remembered */
      }
      const redirectTo = searchParams.get("redirectTo") ?? "/mobile";
      router.push(redirectTo as never);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 401) setError(t("invalidCredentials"));
      else if (err instanceof AxiosError && !err.response) setError(tm("noConnection"));
      else setError(t("errorGeneric"));
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="flex justify-end p-3">
        <LanguageSwitcher />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-16">
        <div className="flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static branding asset */}
          <img src="/branding/logo.jpeg" alt="" className="h-20 w-20 rounded-2xl object-contain shadow-sm" />
          <div>
            <h1 className="text-2xl font-semibold">{tm("appName")}</h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <UtensilsCrossed className="h-4 w-4" />
              {tm("signInSubtitle")}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="w-full max-w-xs space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="username">{t("username")}</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              className="h-12 text-base"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">{t("password")}</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="go"
                autoFocus={rememberedUser}
                className="h-12 pe-12 text-base"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute end-1 top-1 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground"
                aria-label={showPassword ? tm("hidePassword") : tm("showPassword")}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("signingIn")}
              </>
            ) : (
              t("signIn")
            )}
          </Button>
        </form>

        <p className="max-w-xs text-center text-xs text-muted-foreground">{tm("installHint")}</p>
      </div>
    </div>
  );
}
