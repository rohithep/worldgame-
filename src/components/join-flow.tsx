"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationPicker, type LocationValue } from "@/components/location-picker";
import { SaveLoginCard } from "@/components/save-login-card";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { MIN_AGE } from "@/lib/constants";
import { fetchSafe } from "@/lib/fetch-client";
import { validateBirthYear, validatePin, validateUsername } from "@/lib/validators";
import { cn } from "@/lib/utils";

interface JoinFlowProps {
  initialMode: "new" | "returning";
}

const TOTAL_STEPS = 6;

export function JoinFlow({ initialMode }: JoinFlowProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"new" | "returning">(initialMode);

  // Returning player state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // New player multi-step state
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState<string>("");
  const [location, setLocation] = useState<LocationValue>({
    countryCode: "",
    countryName: "",
    stateName: "",
    districtName: "",
    stateSource: "list",
    districtSource: "list",
  });
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "unavailable"
  >("idle");
  const [usernameMsg, setUsernameMsg] = useState<string>("");

  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Save-your-login screen state (kept strictly in memory)
  const [createdCredentials, setCreatedCredentials] = useState<{
    usernameDisplay: string;
    pin: string;
  } | null>(null);

  const birthYearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years: number[] = [];
    for (let y = current; y >= 1920; y--) {
      years.push(y);
    }
    return years;
  }, []);

  const birthYearCheck = useMemo(() => {
    if (!birthYear) return null;
    return validateBirthYear(Number(birthYear), MIN_AGE);
  }, [birthYear]);

  // Debounced live username availability check
  useEffect(() => {
    const trimmed = username.trim();
    const timer = setTimeout(async () => {
      if (!trimmed) {
        setUsernameStatus("idle");
        setUsernameMsg("");
        return;
      }

      const localCheck = validateUsername(trimmed);
      if (!localCheck.valid) {
        setUsernameStatus("unavailable");
        setUsernameMsg(localCheck.error || "Invalid username.");
        return;
      }

      setUsernameStatus("checking");
      setUsernameMsg("Checking availability...");

      const res = await fetchSafe<{ available?: boolean; error?: string }>(
        "/api/auth/check-username",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: trimmed }),
          timeoutMs: 8000,
        }
      );

      if (!res.ok && !res.data) {
        setUsernameStatus("unavailable");
        setUsernameMsg(res.error || "Could not check availability right now.");
      } else if (res.data?.available) {
        setUsernameStatus("available");
        setUsernameMsg("Username is available!");
      } else {
        setUsernameStatus("unavailable");
        setUsernameMsg(res.data?.error || res.error || "Username is not available.");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username]);

  const pinValidation = useMemo(() => {
    if (!pin) return null;
    return validatePin(pin);
  }, [pin]);

  const pinsMatch = pin.length === 6 && pin === pinConfirm;

  function canProceedStep(): boolean {
    if (step === 1) return true; // Name is optional
    if (step === 2) return Boolean(birthYear && birthYearCheck?.valid);
    if (step === 3) return Boolean(location.countryCode);
    if (step === 4) return usernameStatus === "available";
    if (step === 5) return Boolean(pinValidation?.valid && pinsMatch);
    return Boolean(turnstileToken);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!canProceedStep()) return;

    setRegisterLoading(true);
    setRegisterError(null);

    const res = await fetchSafe<{
      ok?: boolean;
      error?: string;
      player?: { usernameDisplay: string };
    }>("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || null,
        birthYear: Number(birthYear),
        countryCode: location.countryCode,
        countryName: location.countryName,
        stateName: location.stateName.trim() || null,
        districtName: location.districtName.trim() || null,
        stateSource: location.stateSource,
        districtSource: location.districtSource,
        username: username.trim(),
        pin,
        turnstileToken,
      }),
    });

    setRegisterLoading(false);

    if (!res.ok || !res.data?.ok) {
      setRegisterError(res.error || "Could not create account.");
      return;
    }

    setCreatedCredentials({
      usernameDisplay: res.data.player?.usernameDisplay || username.trim(),
      pin,
    });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    const res = await fetchSafe<{ ok?: boolean; error?: string }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: loginUsername.trim(),
        pin: loginPin,
      }),
    });

    setLoginLoading(false);

    if (!res.ok || !res.data?.ok) {
      setLoginError(
        res.offline || res.timedOut
          ? res.error
          : res.data?.error || res.error || "Username or PIN is incorrect."
      );
      return;
    }

    router.push("/games");
    router.refresh();
  }

  if (createdCredentials) {
    return (
      <SaveLoginCard
        usernameDisplay={createdCredentials.usernameDisplay}
        pin={createdCredentials.pin}
        onContinue={() => {
          setCreatedCredentials(null);
          setPin("");
          setPinConfirm("");
          router.push("/games");
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle — Apple Segmented Control with Spring Pill */}
      <div
        role="tablist"
        aria-label="Account mode"
        className="apple-segmented grid grid-cols-2"
      >
        {(["new", "returning"] as const).map((tab) => {
          const active = mode === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(tab)}
              className={cn(
                "relative min-h-10 rounded-full text-sm font-medium transition-colors",
                active ? "text-[#090C12]" : "text-[#9AA3B2] hover:text-[#F4F1EA]"
              )}
            >
              {active && (
                <motion.span
                  layoutId="join-mode-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-b from-[#F4C36B] to-[#DE9B38] shadow-[0_4px_16px_rgba(232,168,73,0.45)]"
                />
              )}
              <span className="relative z-10">
                {tab === "new" ? "New Player" : "Returning Player"}
              </span>
            </button>
          );
        })}
      </div>

      {mode === "returning" ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="login-username"
              className="mb-1.5 block text-sm font-semibold text-[#0B1220]"
            >
              Username
            </label>
            <Input
              id="login-username"
              name="username"
              autoComplete="username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="Your public username"
              required
            />
          </div>

          <div>
            <label
              htmlFor="login-pin"
              className="mb-1.5 block text-sm font-semibold text-[#0B1220]"
            >
              6-Digit PIN
            </label>
            <div className="relative">
              <Input
                id="login-pin"
                name="pin"
                type={showLoginPin ? "text" : "password"}
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoComplete="current-password"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className="font-score pr-12 tracking-[0.25em]"
                required
              />
              <button
                type="button"
                aria-label={showLoginPin ? "Hide PIN" : "Show PIN"}
                onClick={() => setShowLoginPin((v) => !v)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#5B6475] hover:bg-[#F4F7FC]"
              >
                {showLoginPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {loginError && (
            <p
              role="alert"
              aria-live="assertive"
              className="rounded-xl border border-[#FF4D6A]/30 bg-[#FFF0F3] px-4 py-3 text-sm font-medium text-[#B91C3B]"
            >
              {loginError}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loginLoading || !loginUsername.trim() || loginPin.length !== 6}
          >
            {loginLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Enter the Arcade"
            )}
          </Button>

          <p className="text-center text-xs text-[#5B6475]">
            No email or recovery exists — a lost PIN means a lost account.
          </p>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-6">
          {/* Step progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#9AA3B2]">
              <span>
                Step {step} of {TOTAL_STEPS}
              </span>
              <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#E8A849] to-[#F7D186] transition-all duration-300"
                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <h2 className="font-heading text-xl font-bold text-[#0B1220]">
                What&apos;s your name?
              </h2>
              <p className="text-sm text-[#5B6475]">
                Optional and strictly private. Your name is never shown on any leaderboard.
              </p>
              <Input
                id="reg-name"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name (optional)"
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h2 className="font-heading text-xl font-bold text-[#0B1220]">
                What year were you born?
              </h2>
              <p className="text-sm text-[#5B6475]">
                Private and never displayed publicly. Players under {MIN_AGE} cannot register; younger players should have a parent&apos;s permission.
              </p>
              <select
                id="reg-birth-year"
                aria-label="Birth year"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="flex min-h-12 w-full rounded-2xl border border-white/20 bg-[#0B101B] px-4 py-2.5 text-base text-[#F4F1EA] focus:border-[#E8A849] focus:outline-none focus:ring-2 focus:ring-[#E8A849]/30"
              >
                <option value="">Select birth year</option>
                {birthYearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {birthYearCheck && !birthYearCheck.valid && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#FFB020]/40 bg-[#FFF8E8] px-4 py-3 text-sm font-medium text-[#7A4D00]"
                >
                  {birthYearCheck.error}
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h2 className="font-heading text-xl font-bold text-[#0B1220]">
                Where are you playing from?
              </h2>
              <p className="text-sm text-[#5B6475]">
                Only your country flag & name appear publicly. State and district stay private.
              </p>
              <LocationPicker value={location} onChange={setLocation} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h2 className="font-heading text-xl font-bold text-[#0B1220]">
                Choose your public username
              </h2>
              <p className="text-sm text-[#5B6475]">
                3–20 characters: letters, numbers, and underscores only.
              </p>
              <Input
                id="reg-username"
                value={username}
                maxLength={20}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Pixel_Comet99"
                autoFocus
              />
              {usernameStatus !== "idle" && (
                <div
                  aria-live="polite"
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium",
                    usernameStatus === "available" && "text-[#128A60]",
                    usernameStatus === "unavailable" && "text-[#C92544]",
                    usernameStatus === "checking" && "text-[#5B6475]"
                  )}
                >
                  {usernameStatus === "checking" && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {usernameStatus === "available" && (
                    <CheckCircle2 className="h-4 w-4 text-[#19B37D]" />
                  )}
                  {usernameStatus === "unavailable" && (
                    <XCircle className="h-4 w-4 text-[#E5394D]" />
                  )}
                  <span>{usernameMsg}</span>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-[#0B1220]">
                  Pick a 6-digit PIN
                </h2>
                <p className="mt-1 text-sm text-[#5B6475]">
                  This is your only key to sign back in. Avoid sequential or repeating numbers.
                </p>
              </div>

              <div>
                <label
                  htmlFor="reg-pin"
                  className="mb-1.5 block text-sm font-semibold text-[#0B1220]"
                >
                  6-Digit PIN
                </label>
                <div className="relative">
                  <Input
                    id="reg-pin"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    className="font-score pr-12 tracking-[0.25em]"
                    autoFocus
                  />
                  <button
                    type="button"
                    aria-label={showPin ? "Hide PIN" : "Show PIN"}
                    onClick={() => setShowPin((v) => !v)}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#5B6475] hover:bg-[#F4F7FC]"
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {pinValidation && !pinValidation.valid && (
                  <p className="mt-1.5 text-sm font-medium text-[#C92544]">
                    {pinValidation.error}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reg-pin-confirm"
                  className="mb-1.5 block text-sm font-semibold text-[#0B1220]"
                >
                  Confirm 6-Digit PIN
                </label>
                <Input
                  id="reg-pin-confirm"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={6}
                  value={pinConfirm}
                  onChange={(e) =>
                    setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="••••••"
                  className="font-score tracking-[0.25em]"
                />
                {pinConfirm.length === 6 && !pinsMatch && (
                  <p className="mt-1.5 text-sm font-medium text-[#C92544]">
                    PINs do not match.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-bold text-[#0B1220]">
                Ready to join?
              </h2>
              <div className="rounded-2xl border border-[#E6EAF2] bg-[#F7F9FC] p-4 text-sm text-[#5B6475]">
                <p>
                  Public handle:{" "}
                  <strong className="text-[#0B1220]">{username.trim()}</strong>
                </p>
                <p className="mt-1">
                  Public country:{" "}
                  <strong className="text-[#0B1220]">{location.countryName}</strong>
                </p>
                <p className="mt-1 text-xs">
                  No email is collected. Remember to save your PIN on the next screen.
                </p>
              </div>

              <TurnstileWidget onToken={setTurnstileToken} />

              {registerError && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#FF4D6A]/30 bg-[#FFF0F3] px-4 py-3 text-sm font-medium text-[#B91C3B]"
                >
                  {registerError}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            {step > 1 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <Button
                type="button"
                disabled={!canProceedStep()}
                onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="lg"
                disabled={registerLoading || !canProceedStep()}
              >
                {registerLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
