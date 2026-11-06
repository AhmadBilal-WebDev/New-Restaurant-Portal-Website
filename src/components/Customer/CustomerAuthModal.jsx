'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Mail,
  Search,
  ShieldCheck,
  X
} from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import {
  requestCustomerOtp,
  resendCustomerOtp,
  signinCustomer,
  verifyCustomerOtp
} from '@/shared/lib/customerAuthApi';
import { readLocationSession } from '@/shared/lib/publicBranchesApi';

const COUNTRIES = [
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", dialCode: "+973", flag: "🇧🇭" },
  { code: "OM", name: "Oman", dialCode: "+968", flag: "🇴🇲" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰" },
  { code: "AF", name: "Afghanistan", dialCode: "+93", flag: "🇦🇫" },
  { code: "IR", name: "Iran", dialCode: "+98", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", dialCode: "+964", flag: "🇮🇶" },
  { code: "JO", name: "Jordan", dialCode: "+962", flag: "🇯🇴" },
  { code: "LB", name: "Lebanon", dialCode: "+961", flag: "🇱🇧" }
];

const RESEND_SECONDS = 60;
const OTP_LENGTH = 6;

function OtpBoxes({ value, onChange, disabled }) {
  const inputsRef = useRef([]);
  const digits = useMemo(() => {
    const arr = String(value || "").replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
    while (arr.length < OTP_LENGTH) arr.push("");
    return arr;
  }, [value]);

  const setDigit = (index, char) => {
    const next = [...digits];
    next[index] = char;
    onChange(next.join("").replace(/\s/g, ""));
  };

  const focusAt = (index) => {
    const el = inputsRef.current[index];
    if (el) {
      el.focus();
      el.select?.();
    }
  };

  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2.5">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={digit}
          aria-label={`OTP digit ${index + 1}`}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            if (!raw) {
              setDigit(index, "");
              return;
            }
            if (raw.length > 1) {
              const pasted = raw.slice(0, OTP_LENGTH).split("");
              const merged = [...digits];
              pasted.forEach((ch, i) => {
                if (index + i < OTP_LENGTH) merged[index + i] = ch;
              });
              onChange(merged.join(""));
              focusAt(Math.min(index + pasted.length, OTP_LENGTH - 1));
              return;
            }
            setDigit(index, raw);
            if (index < OTP_LENGTH - 1) focusAt(index + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[index] && index > 0) {
              focusAt(index - 1);
            }
            if (e.key === "ArrowLeft" && index > 0) focusAt(index - 1);
            if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) focusAt(index + 1);
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = (e.clipboardData.getData("text") || "")
              .replace(/\D/g, "")
              .slice(0, OTP_LENGTH);
            if (!pasted) return;
            onChange(pasted);
            focusAt(Math.min(pasted.length, OTP_LENGTH - 1));
          }}
          className="h-12 w-10 sm:h-14 sm:w-12 rounded-xl border border-gray-200 bg-[#FAFBFC] text-center text-lg sm:text-xl font-black text-[#182230] shadow-sm outline-none transition-all focus:border-[#FFB800] focus:bg-white focus:ring-4 focus:ring-[#FFB800]/20 disabled:opacity-60"
        />
      ))}
    </div>
  );
}

function CustomerAuthModal({
  isOpen,
  onClose,
  onSuccess,
  onAuthSuccess,
  initialMode = "register"
}) {
  const {
    currentBranch,
    currentBranchId,
    completeCustomerAuth,
    addToast
  } = useRestaurant();

  const [authMode, setAuthMode] = useState("register");
  const [step, setStep] = useState("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("male");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [otp, setOtp] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [flowLabel, setFlowLabel] = useState("signup");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const countryDropdownRef = useRef(null);
  const autoSubmittedOtpRef = useRef("");

  const branchId = useMemo(() => {
    const saved = readLocationSession();
    return (
      saved?.branchId ||
      currentBranch?.id ||
      (currentBranchId && !String(currentBranchId).startsWith("branch-")
        ? currentBranchId
        : "") ||
      ""
    );
  }, [currentBranch?.id, currentBranchId]);

  const branchLabel = useMemo(
    () =>
      currentBranch?.name ||
      readLocationSession()?.branchName ||
      "your branch",
    [currentBranch?.name]
  );

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const q = countrySearch.toLowerCase().trim();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const resetFormState = useCallback(() => {
    setStep("form");
    setOtp("");
    setOtpHint("");
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(false);
    setResendIn(0);
    setIsCountryDropdownOpen(false);
    setCountrySearch("");
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setAuthMode(initialMode || "register");
    resetFormState();
  }, [isOpen, initialMode, resetFormState]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
        setIsCountryDropdownOpen(false);
      }
    };
    if (isCountryDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCountryDropdownOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendIn((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  const finishAuth = useCallback(
    (user) => {
      if (onAuthSuccess) onAuthSuccess(user);
      else if (onSuccess) onSuccess(user);
      else onClose();
    },
    [onAuthSuccess, onSuccess, onClose]
  );

  const startOtpStep = (message, flow) => {
    setStep("otp");
    setOtp("");
    autoSubmittedOtpRef.current = "";
    setFlowLabel(flow || authMode);
    setOtpHint(message || "OTP sent to your email.");
    setSuccessMessage(message || "OTP sent to your email.");
    setErrorMessage("");
    setResendIn(RESEND_SECONDS);
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (authMode === "register") {
      if (!branchId) {
        setErrorMessage("Please select your delivery location / branch first.");
        return;
      }
      if (!fullName.trim()) {
        setErrorMessage("Please enter your full name.");
        return;
      }
      if (!phone.trim() || phone.trim().length < 7) {
        setErrorMessage("Please enter a valid mobile number.");
        return;
      }
      if (!gender) {
        setErrorMessage("Please select your gender.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result =
        authMode === "register"
          ? await requestCustomerOtp({
              name: fullName.trim(),
              email: cleanEmail,
              gender,
              countryCode: selectedCountry.dialCode,
              contactNumber: phone.trim(),
              branchId
            })
          : await signinCustomer({ email: cleanEmail });

      if (!result.ok) {
        setErrorMessage(result.message || "Could not send OTP.");
        return;
      }
      startOtpStep(result.message, result.flow || (authMode === "register" ? "signup" : "signin"));
      addToast("OTP Sent", result.message || "Check your email for the code.", "success");
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault?.();
    setErrorMessage("");
    const code = String(otp || "").replace(/\D/g, "");
    if (code.length !== OTP_LENGTH) {
      setErrorMessage(`Enter the ${OTP_LENGTH}-digit OTP from your email.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await verifyCustomerOtp({
        email: email.trim().toLowerCase(),
        otp: code
      });
      if (!result.ok || !result.token || !result.user) {
        setErrorMessage(result.message || "Invalid or expired OTP.");
        return;
      }

      completeCustomerAuth({
        token: result.token,
        user: result.user,
        branch: result.branch
      });
      addToast("Welcome!", result.message || "Login successful", "success");
      finishAuth(result.user);
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendIn > 0 || isSubmitting) return;
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const result = await resendCustomerOtp({ email: email.trim().toLowerCase() });
      if (!result.ok) {
        setErrorMessage(result.message || "Could not resend OTP.");
        return;
      }
      setOtp("");
      autoSubmittedOtpRef.current = "";
      setResendIn(RESEND_SECONDS);
      setSuccessMessage(result.message || "A new OTP has been sent.");
      setOtpHint(result.message || "A new OTP has been sent.");
      addToast("OTP Resent", result.message || "Check your email again.", "success");
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (step !== "otp" || isSubmitting) return;
    const code = String(otp || "").replace(/\D/g, "");
    if (code.length !== OTP_LENGTH) {
      if (code.length < OTP_LENGTH) autoSubmittedOtpRef.current = "";
      return;
    }
    if (autoSubmittedOtpRef.current === code) return;
    autoSubmittedOtpRef.current = code;
    void handleVerifyOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step, isSubmitting]);

  if (!isOpen) return null;

  const isRegister = authMode === "register";

  return (
    <div
      id="customer-auth-modal"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-0 backdrop-blur-[2px] sm:items-center sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[440px] overflow-hidden rounded-t-[28px] border border-gray-100 bg-white shadow-2xl sm:my-auto sm:rounded-[28px] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute inset-x-0 top-0 h-28 opacity-90"
          style={{
            background:
              "radial-gradient(120% 100% at 0% 0%, rgba(255,184,0,0.28), transparent 55%), radial-gradient(90% 80% at 100% 0%, rgba(229,27,35,0.12), transparent 50%)"
          }}
        />

        <button
          id="auth-modal-close-btn"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-800"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative p-5 sm:p-8">
          {errorMessage ? (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span className="flex-1 leading-relaxed">{errorMessage}</span>
            </div>
          ) : null}

          {successMessage && step === "otp" ? (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1 leading-relaxed">{successMessage}</span>
            </div>
          ) : null}

          {step === "otp" ? (
            <div>
              <div className="mb-5 flex items-center gap-3 pr-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFB800]/15 text-[#C48A00]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-['Outfit'] text-xl font-black tracking-tight text-[#182230] sm:text-2xl">
                    Verify OTP
                  </h2>
                  <p className="mt-0.5 text-xs font-medium text-gray-500 sm:text-sm">
                    {flowLabel === "signup" || isRegister
                      ? "Complete your signup with the code we emailed you."
                      : "Enter the code we emailed to log you in."}
                  </p>
                </div>
              </div>

              <div className="mb-5 rounded-2xl border border-[#EEE7DC] bg-[#FFF9EF] px-3.5 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#182230]">
                  <Mail className="h-4 w-4 text-[#C48A00]" />
                  <span className="truncate">{email}</span>
                </div>
                {otpHint ? (
                  <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-gray-500">
                    {otpHint}
                  </p>
                ) : null}
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <OtpBoxes value={otp} onChange={setOtp} disabled={isSubmitting} />

                <button
                  type="submit"
                  disabled={isSubmitting || String(otp).replace(/\D/g, "").length !== OTP_LENGTH}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFB800] py-3.5 text-base font-extrabold text-white shadow-[0_10px_24px_-12px_rgba(255,184,0,0.8)] transition-all hover:bg-[#E5A500] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify & Continue"
                  )}
                </button>

                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-xs font-medium text-gray-500">
                    Didn&apos;t get the code?
                  </p>
                  <button
                    type="button"
                    disabled={resendIn > 0 || isSubmitting}
                    onClick={() => void handleResendOtp()}
                    className="cursor-pointer text-sm font-bold text-[#C48A00] transition-colors hover:text-[#182230] disabled:cursor-not-allowed disabled:text-gray-400"
                  >
                    {resendIn > 0
                      ? `Resend OTP in ${resendIn}s`
                      : "Resend OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("form");
                      setOtp("");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className="cursor-pointer text-xs font-semibold text-gray-500 underline-offset-2 hover:text-[#182230] hover:underline"
                  >
                    Change email / details
                  </button>
                </div>
              </form>
            </div>
          ) : isRegister ? (
            <div>
              <div className="pr-8 text-center sm:text-left">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#C48A00]">
                  Create account
                </p>
                <h2 className="font-['Outfit'] text-2xl font-black tracking-tight text-[#182230]">
                  Register
                </h2>
                <p className="mt-1 text-xs font-medium text-gray-500 sm:text-sm">
                  Sign up for {branchLabel}. We&apos;ll email you a one-time code.
                </p>
              </div>

              <form onSubmit={handleRequestOtp} className="mt-5 space-y-3.5">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#182230] sm:text-sm">
                    Full Name
                  </label>
                  <input
                    id="register-name-input"
                    type="text"
                    required
                    autoFocus
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 placeholder-gray-400 transition-all focus:border-[#FFB800] focus:outline-none focus:ring-2 focus:ring-[#FFB800]/20 sm:py-3"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#182230] sm:text-sm">
                    Email Address
                  </label>
                  <input
                    id="register-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 placeholder-gray-400 transition-all focus:border-[#FFB800] focus:outline-none focus:ring-2 focus:ring-[#FFB800]/20 sm:py-3"
                  />
                </div>

                <div className="relative" ref={countryDropdownRef}>
                  <label className="mb-1.5 block text-xs font-bold text-[#182230] sm:text-sm">
                    Mobile
                  </label>
                  <div className="flex overflow-hidden rounded-xl border border-gray-300 bg-white focus-within:border-[#FFB800] focus-within:ring-2 focus-within:ring-[#FFB800]/20">
                    <button
                      type="button"
                      id="country-code-trigger-btn"
                      onClick={() => setIsCountryDropdownOpen((prev) => !prev)}
                      className="flex shrink-0 cursor-pointer select-none items-center gap-1 border-r border-gray-300 bg-[#F8F9FA] px-2 py-2.5 text-xs font-bold text-[#182230] transition-colors hover:bg-[#F1F3F5] sm:px-2.5 sm:py-3 sm:text-sm"
                      title="Select Country Code"
                    >
                      <span className="text-sm leading-none">{selectedCountry.flag}</span>
                      <span>{selectedCountry.dialCode}</span>
                      <ChevronDown className="h-3 w-3 text-gray-500" />
                    </button>
                    <input
                      id="register-mobile-input"
                      type="tel"
                      required
                      placeholder="3001234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full px-2.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none sm:px-3 sm:py-3 sm:text-sm"
                    />
                  </div>

                  {isCountryDropdownOpen ? (
                    <div className="absolute left-0 top-full z-50 mt-1.5 w-64 space-y-2 rounded-2xl border border-gray-200 bg-white p-2.5 shadow-xl sm:w-72 animate-in fade-in zoom-in-95 duration-150">
                      <div className="relative">
                        <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search country or code..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pr-3 pl-8 text-xs text-gray-800 focus:border-[#FFB800] focus:outline-none"
                        />
                      </div>
                      <div className="no-scrollbar max-h-48 space-y-0.5 overflow-y-auto text-xs">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setSelectedCountry(c);
                                setIsCountryDropdownOpen(false);
                                setCountrySearch("");
                              }}
                              className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                                selectedCountry.code === c.code
                                  ? "bg-[#FFB800]/15 font-bold text-[#182230]"
                                  : "text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-sm">{c.flag}</span>
                                <span className="truncate">{c.name}</span>
                              </div>
                              <span className="ml-2 shrink-0 font-mono font-bold text-gray-500">
                                {c.dialCode}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="py-3 text-center text-xs text-gray-400">
                            No country found
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#182230] sm:text-sm">
                    Gender
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: "male", label: "Male" },
                      { id: "female", label: "Female" }
                    ].map((option) => {
                      const active = gender === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setGender(option.id)}
                          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition sm:py-3 ${
                            active
                              ? "border-[#FFB800] bg-[#FFB800] text-white"
                              : "border-gray-300 bg-white text-[#182230] hover:border-[#FFB800]/50"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                              active ? "border-white" : "border-gray-300"
                            }`}
                          >
                            {active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                          </span>
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!branchId ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                    Select your branch / delivery location on the home page before registering.
                  </p>
                ) : (
                  <p className="text-[11px] font-medium text-gray-500">
                    Branch: <span className="font-bold text-[#182230]">{branchLabel}</span>
                  </p>
                )}

                <button
                  id="register-submit-btn"
                  type="submit"
                  disabled={isSubmitting || !branchId}
                  className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFB800] py-3.5 text-base font-extrabold text-white shadow-[0_10px_24px_-12px_rgba(255,184,0,0.8)] transition-all hover:bg-[#E5A500] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending OTP…
                    </>
                  ) : (
                    "Register"
                  )}
                </button>

                <div className="pt-1 text-center">
                  <p className="text-xs font-medium text-gray-600 sm:text-sm">
                    Already have an account?{" "}
                    <button
                      type="button"
                      id="switch-to-login-btn"
                      onClick={() => {
                        setAuthMode("login");
                        setErrorMessage("");
                        setSuccessMessage("");
                      }}
                      className="ml-0.5 cursor-pointer font-bold text-[#FFB800] hover:text-[#E5A500] hover:underline"
                    >
                      Login Here
                    </button>
                  </p>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <div className="pr-8 text-left">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#C48A00]">
                  Welcome back
                </p>
                <h2 className="font-['Outfit'] text-xl font-black tracking-tight text-[#182230] sm:text-2xl">
                  Enter your email address
                </h2>
                <p className="mt-1 text-xs font-medium text-gray-500 sm:text-sm">
                  We&apos;ll send a one-time code to log you in
                </p>
              </div>

              <form onSubmit={handleRequestOtp} className="mt-6">
                <div>
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 placeholder-gray-400 transition-all focus:border-[#FFB800] focus:outline-none focus:ring-2 focus:ring-[#FFB800]/20"
                  />
                </div>

                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFB800] py-3.5 text-base font-extrabold text-white shadow-[0_10px_24px_-12px_rgba(255,184,0,0.8)] transition-all hover:bg-[#E5A500] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending OTP…
                    </>
                  ) : (
                    "Send Login OTP"
                  )}
                </button>

                <div className="mt-5 text-center">
                  <p className="text-xs font-medium text-gray-600 sm:text-sm">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      id="switch-to-register-btn"
                      onClick={() => {
                        setAuthMode("register");
                        setErrorMessage("");
                        setSuccessMessage("");
                      }}
                      className="ml-0.5 cursor-pointer font-bold text-[#FFB800] hover:text-[#E5A500] hover:underline"
                    >
                      Register
                    </button>
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { CustomerAuthModal };
