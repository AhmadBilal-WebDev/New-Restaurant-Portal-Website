'use client';

import { useEffect, useRef, useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import {
  loginOwner,
  verifyOwnerEmail,
  setOwnerPassword,
  forgotOwnerPassword,
  verifyForgotPasswordOtp,
  resetOwnerPassword,
  persistOwnerLogin,
  getOwnerApiErrorMessage
} from '@/shared/lib/ownerAuth';
import { publishOwnerIdentity } from '@/shared/lib/ownerProfile';
import {
  Lock,
  Mail,
  ArrowRight,
  Store,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ChevronLeft,
  LayoutGrid
} from "lucide-react";
const LOGIN_SITE_IMG = "/login-site-img.jpg";
const fieldClass = "w-full bg-[#EEF1F6] border border-transparent rounded-2xl pl-11 pr-4 py-3.5 text-sm text-[#1A1D26] placeholder:text-[#9AA3B2] focus:outline-none focus:bg-white focus:border-[#CFD6E4] focus:ring-[3px] focus:ring-[#1A1D26]/08 transition-all duration-200 disabled:opacity-55 disabled:cursor-not-allowed";
const fieldClassWithToggle = "w-full bg-[#EEF1F6] border border-transparent rounded-2xl pl-11 pr-12 py-3.5 text-sm text-[#1A1D26] placeholder:text-[#9AA3B2] focus:outline-none focus:bg-white focus:border-[#CFD6E4] focus:ring-[3px] focus:ring-[#1A1D26]/08 transition-all duration-200";
const labelClass = "block text-[13px] text-[#1A1D26] font-semibold mb-2 font-['Plus_Jakarta_Sans',sans-serif]";
const primaryBtnClass = "group w-full py-3.5 rounded-2xl bg-[#E85A2D] hover:bg-[#D44C22] !text-white text-sm font-semibold tracking-wide transition-all duration-200 shadow-[0_10px_28px_-12px_rgba(232,90,45,0.55)] hover:shadow-[0_14px_32px_-12px_rgba(232,90,45,0.65)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed font-['Outfit',sans-serif]";
const secondaryBtnClass = "w-full py-3 rounded-2xl bg-white hover:bg-[#F4F6FA] text-[#3A4254] border border-[#D8DEE9] text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const ghostBtnClass = "w-full text-sm text-[#6B7280] hover:text-[#1A1D26] pt-1 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer";
const OTP_LENGTH = 6;
const OtpBoxes = ({ value, onChange, disabled = false, autoFocus = false }) => {
  const inputsRef = useRef([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] || "");
  useEffect(() => {
    if (!autoFocus || disabled) return;
    inputsRef.current[0]?.focus();
  }, [autoFocus, disabled]);
  const focusAt = (index) => {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    inputsRef.current[clamped]?.focus();
    inputsRef.current[clamped]?.select();
  };
  const commitDigits = (nextDigits) => {
    onChange(nextDigits.join("").slice(0, OTP_LENGTH));
  };
  const handleChange = (index, raw) => {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      const next2 = [...digits];
      next2[index] = "";
      commitDigits(next2);
      return;
    }
    if (cleaned.length > 1) {
      const next2 = Array.from({ length: OTP_LENGTH }, () => "");
      const chars = cleaned.slice(0, OTP_LENGTH).split("");
      chars.forEach((char, i) => {
        next2[i] = char;
      });
      commitDigits(next2);
      focusAt(Math.min(chars.length, OTP_LENGTH - 1));
      return;
    }
    const next = [...digits];
    next[index] = cleaned;
    commitDigits(next);
    if (index < OTP_LENGTH - 1) focusAt(index + 1);
  };
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
        commitDigits(next);
        return;
      }
      if (index > 0) {
        next[index - 1] = "";
        commitDigits(next);
        focusAt(index - 1);
      }
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusAt(index - 1);
    }
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      focusAt(index + 1);
    }
  };
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    const next = Array.from({ length: OTP_LENGTH }, () => "");
    pasted.slice(0, OTP_LENGTH).split("").forEach((char, i) => {
      next[i] = char;
    });
    commitDigits(next);
    focusAt(Math.min(pasted.length, OTP_LENGTH) - 1);
  };
  return <div className="flex items-center justify-between gap-2 sm:gap-2.5">
      {digits.map((digit, index) => <input
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
    onChange={(e) => handleChange(index, e.target.value)}
    onKeyDown={(e) => handleKeyDown(index, e)}
    onPaste={handlePaste}
    onFocus={(e) => e.target.select()}
    aria-label={`Digit ${index + 1}`}
    className={`h-12 w-11 sm:h-14 sm:w-12 rounded-xl bg-[#EEF1F6] border text-center text-lg sm:text-xl font-bold text-[#1A1D26] outline-none transition-all duration-150 ${digit ? "border-[#E85A2D]/45 bg-white shadow-sm" : "border-transparent"} focus:bg-white focus:border-[#E85A2D] focus:ring-[3px] focus:ring-[#E85A2D]/15 disabled:opacity-55`}
  />)}
    </div>;
};
const AdminLoginPage = ({
  onLoginSuccess,
  onGoToStore
}) => {
  const { config, addToast } = useRestaurant();
  const [step, setStep] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isEmailChecked, setIsEmailChecked] = useState(false);
  const [otp, setOtp] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const completeLogin = (ownerEmail, token, owner, staffAccess = null) => {
    persistOwnerLogin(ownerEmail, token, owner, staffAccess);
    if (staffAccess) {
      publishOwnerIdentity({
        accountKind: "staff",
        ownerFirstName: staffAccess.firstName,
        ownerLastName: staffAccess.lastName,
        ownerEmail: staffAccess.email || ownerEmail
      });
    }
    addToast("Welcome Back", "Logged in to RestaurantOS Portal.", "success");
    onLoginSuccess();
  };
  const resetAuthState = (keepEmail = false) => {
    setStep("login");
    setIsEmailChecked(false);
    setPassword("");
    setOtp("");
    setForgotOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    if (!keepEmail) {
      setEmail("");
    }
  };
  const handleCheckEmailOrLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (isEmailChecked && !password.trim()) {
      setError("Please enter your password.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await loginOwner(
        email.trim(),
        isEmailChecked ? password : ""
      );
      if (result.token) {
        completeLogin(email.trim(), result.token, result.owner, result.staffAccess);
        return;
      }
      const lowerMessage = (result.message || "").toLowerCase();
      if (result.nextStep === "otp" || lowerMessage.includes("otp") || lowerMessage.includes("verify") || lowerMessage.includes("verification")) {
        setIsEmailChecked(false);
        setStep("otp");
        setPassword("");
        addToast(
          "Verification Required",
          result.message || "OTP sent to your email.",
          "info"
        );
        return;
      }
      if (result.nextStep === "set-password" || lowerMessage.includes("set password") || lowerMessage.includes("create password") || lowerMessage.includes("password setup")) {
        setIsEmailChecked(false);
        setStep("set-password");
        setPassword("");
        addToast(
          "Set Password",
          result.message || "Please create a new password.",
          "info"
        );
        return;
      }
      if (!isEmailChecked && result.ok) {
        setIsEmailChecked(true);
        setStep("login");
        return;
      }
      if (!result.ok) {
        setError(result.message || "Invalid credentials or email not found.");
      }
    } catch (err) {
      setError(getOwnerApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp.trim()) {
      setError("Please enter the OTP code.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await verifyOwnerEmail(
        email.trim(),
        otp.trim()
      );
      if (result.token) {
        completeLogin(email.trim(), result.token, result.owner, result.staffAccess);
        return;
      }
      if (result.ok && (result.nextStep === "set-password" || result.nextStep === "done")) {
        setStep("set-password");
        addToast(
          "Email Verified",
          result.message,
          "success"
        );
        return;
      }
      setError(result.message || "Invalid OTP code.");
    } catch (err) {
      setError(getOwnerApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };
  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await setOwnerPassword(
        email.trim(),
        newPassword,
        confirmPassword
      );
      if (result.token) {
        completeLogin(
          email.trim(),
          result.token,
          result.owner,
          result.staffAccess
        );
        return;
      }
      if (!result.ok) {
        setError(
          result.message || "Could not save password."
        );
        return;
      }
      const loginResult = await loginOwner(
        email.trim(),
        newPassword
      );
      if (loginResult.token) {
        completeLogin(
          email.trim(),
          loginResult.token,
          loginResult.owner,
          loginResult.staffAccess
        );
        return;
      }
      addToast(
        "Password Saved",
        result.message,
        "success"
      );
      setPassword(newPassword);
      setStep("login");
      setIsEmailChecked(true);
    } catch (err) {
      setError(getOwnerApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };
  const handleResendOtp = async () => {
    setError("");
    setIsLoading(true);
    try {
      const result = await loginOwner(
        email.trim(),
        ""
      );
      if (result.nextStep === "otp" || result.ok) {
        addToast(
          "OTP Sent",
          result.message || "A new OTP has been sent to your email.",
          "info"
        );
      } else {
        setError(
          result.message || "Failed to resend OTP."
        );
      }
    } catch (err) {
      setError(getOwnerApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await forgotOwnerPassword(
        email.trim()
      );
      if (!result.ok) {
        setError(
          result.message || "Could not send forgot password OTP."
        );
        return;
      }
      setForgotOtp("");
      setStep("forgot-otp");
      addToast(
        "OTP Sent",
        result.message || "A password reset OTP has been sent to your email.",
        "success"
      );
    } catch (err) {
      setError(getOwnerApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };
  const handleVerifyForgotOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!forgotOtp.trim()) {
      setError("Please enter the OTP code.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await verifyForgotPasswordOtp(
        email.trim(),
        forgotOtp.trim()
      );
      if (!result.ok) {
        setError(
          result.message || "Invalid or expired password reset OTP."
        );
        return;
      }
      setStep("reset-password");
      setNewPassword("");
      setConfirmPassword("");
      addToast(
        "OTP Verified",
        result.message || "OTP verified. Create your new password.",
        "success"
      );
    } catch (err) {
      setError(getOwnerApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError(
        "Password must be at least 6 characters long."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(
        "Password and confirm password do not match."
      );
      return;
    }
    setIsLoading(true);
    try {
      const result = await resetOwnerPassword(
        email.trim(),
        newPassword,
        confirmPassword
      );
      if (result.token) {
        completeLogin(
          email.trim(),
          result.token,
          result.owner,
          result.staffAccess
        );
        return;
      }
      if (!result.ok) {
        setError(
          result.message || "Could not reset your password."
        );
        return;
      }
      addToast(
        "Password Reset",
        result.message || "Password reset successfully. Please sign in.",
        "success"
      );
      setPassword("");
      setStep("login");
      setIsEmailChecked(true);
      setForgotOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getOwnerApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };
  const handleResendForgotOtp = async () => {
    setError("");
    setIsLoading(true);
    try {
      const result = await forgotOwnerPassword(
        email.trim()
      );
      if (!result.ok) {
        setError(
          result.message || "Failed to resend password reset OTP."
        );
        return;
      }
      setForgotOtp("");
      addToast(
        "OTP Sent",
        result.message || "A new password reset OTP has been sent.",
        "info"
      );
    } catch (err) {
      setError(getOwnerApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };
  const stepTitle = step === "login" ? isEmailChecked ? "Enter your password" : "Welcome back" : step === "otp" ? "Verify your email" : step === "set-password" ? "Create your password" : step === "forgot-password" ? "Reset your password" : step === "forgot-otp" ? "Confirm reset code" : "Set a new password";
  const stepLabel = step === "login" ? !isEmailChecked ? "Sign in with your work email to continue." : `Continue as ${email.trim() || "owner"}` : step === "otp" ? `We sent a 6-digit code to ${email.trim()}` : step === "set-password" ? "Choose a secure password for your owner account" : step === "forgot-password" ? "Enter the email linked to your restaurant" : step === "forgot-otp" ? `Enter the reset code sent to ${email.trim()}` : "Your new password must be at least 6 characters";
  const renderSubmitContent = (idleLabel, loadingLabel) => isLoading ? <>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{loadingLabel}</span>
      </> : <>
        <span>{idleLabel}</span>
        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </>;
  return <div className="admin-login-page min-h-screen bg-white flex flex-col lg:flex-row lg:items-stretch selection:bg-[#E85A2D]/25 selection:text-[#1A1D26] font-['Plus_Jakarta_Sans',sans-serif]">
      {
    /* LEFT — IMAGE only on desktop split (hidden on mobile) */
  }
      <div className="relative hidden lg:block lg:w-1/2 shrink-0 lg:h-screen lg:sticky lg:top-0 overflow-hidden bg-[#F7F1E8]">
        <img
    src={LOGIN_SITE_IMG}
    alt=""
    className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none select-none"
  />
      </div>

      {
    /* RIGHT — CLEAN WHITE FORM PANEL */
  }
      <div
    className="relative flex-1 min-h-screen flex flex-col justify-center items-center px-5 py-8 sm:px-10 lg:px-14 xl:px-20 bg-white"
    style={{
      backgroundImage: "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.055) 1px, transparent 0)",
      backgroundSize: "18px 18px",
      backgroundColor: "#ffffff"
    }}
  >
        <div className="relative w-full max-w-[400px] animate-[login-fade_0.45s_ease-out]">
          {
    /* Brand */
  }
          <div className="flex items-center gap-3 mb-8 sm:mb-10">
            <div className="w-10 h-10 rounded-[10px] bg-[#1A1D26] !text-white flex items-center justify-center shadow-sm">
              <LayoutGrid className="w-[18px] h-[18px] text-white" strokeWidth={2.25} />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-[16px] sm:text-[17px] font-bold text-[#1A1D26] tracking-tight font-['Outfit',sans-serif] truncate">
                {config.name || "Restaurant Hub"}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B93A7]">
                Management Platform
              </p>
            </div>
          </div>

          {
    /* Heading */
  }
          <div className="mb-6 sm:mb-8 space-y-2">
            <h1 className="text-[28px] sm:text-[34px] font-bold text-[#1A1D26] tracking-tight leading-none font-['Outfit',sans-serif]">
              {stepTitle}
            </h1>
            <p className="text-[13px] sm:text-[14px] text-[#6B7280] leading-relaxed break-all">
              {stepLabel}
            </p>
          </div>

          {
    /* ERROR */
  }
          {error ? <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-600 animate-[login-fade_0.25s_ease-out]">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div> : null}

          <div className="space-y-5">

              {
    /* ================================================= */
  }
              {
    /* LOGIN */
  }
              {
    /* ================================================= */
  }

              {step === "login" && <form
    onSubmit={handleCheckEmailOrLogin}
    className="space-y-4"
  >
                  <div>
                    <label className={labelClass}>Email address</label>
                    <div className="relative group">
                      <Mail className="w-4 h-4 text-[#9AA3B2] group-focus-within:text-[#2A3140] absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                      <input
    type="email"
    required
    disabled={isEmailChecked}
    value={email}
    onChange={(e) => {
      const nextValue = e.target.value;
      if (step !== "login" || isEmailChecked) {
        setEmail(nextValue);
        resetAuthState(true);
        return;
      }
      if (nextValue.trim() !== email.trim()) {
        setPassword("");
        setOtp("");
        setForgotOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setError("");
      }
      setEmail(nextValue);
    }}
    placeholder="admin@example.com"
    className={fieldClass}
  />
                    </div>
                  </div>

                  {isEmailChecked && <div className="space-y-2 animate-[login-fade_0.3s_ease-out]">
                      <label className={labelClass}>Password</label>
                      <div className="relative group">
                        <Lock className="w-4 h-4 text-[#9AA3B2] group-focus-within:text-[#2A3140] absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                        <input
    type={showPassword ? "text" : "password"}
    required
    autoFocus
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Enter your password"
    className={fieldClassWithToggle}
  />
                        <button
    type="button"
    onClick={() => setShowPassword((v) => !v)}
    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9AA3B2] hover:text-[#1A1D26] transition-colors p-1 cursor-pointer"
    aria-label={showPassword ? "Hide password" : "Show password"}
  >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="flex justify-end pt-0.5">
                        <button
    type="button"
    onClick={() => {
      setStep("forgot-password");
      setError("");
      setForgotOtp("");
      setNewPassword("");
      setConfirmPassword("");
    }}
    className="text-[12px] text-[#2A3140] hover:text-[#1A1D26] font-semibold transition-colors cursor-pointer"
  >
                          Forgot password?
                        </button>
                      </div>
                    </div>}

                  <button
    type="submit"
    disabled={isLoading}
    className={`${primaryBtnClass} mt-1`}
  >
                    {renderSubmitContent(
    isEmailChecked ? "Sign in" : "Continue",
    isEmailChecked ? "Signing in..." : "Checking email..."
  )}
                  </button>

                  {isEmailChecked && <button
    type="button"
    onClick={() => {
      setIsEmailChecked(false);
      setPassword("");
      setShowPassword(false);
      setError("");
    }}
    className={ghostBtnClass}
  >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Change email address
                    </button>}
                </form>}

              {
    /* ================================================= */
  }
              {
    /* NORMAL EMAIL OTP */
  }
              {
    /* ================================================= */
  }

              {step === "otp" && <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className={labelClass}>Verification code</label>
                    <OtpBoxes
    value={otp}
    onChange={setOtp}
    disabled={isLoading}
    autoFocus
  />
                    <p className="mt-2 text-[12px] text-[#8B93A7]">
                      Check your inbox — the code expires shortly.
                    </p>
                  </div>

                  <button
    type="submit"
    title="Verify OTP"
    disabled={isLoading || otp.length < OTP_LENGTH}
    className={primaryBtnClass}
  >
                    {renderSubmitContent("Verify & continue", "Verifying...")}
                  </button>

                  <button
    type="button"
    title="Resend OTP"
    onClick={handleResendOtp}
    disabled={isLoading}
    className={secondaryBtnClass}
  >
                    <RefreshCw
    className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
  />
                    Resend code
                  </button>

                  <button
    type="button"
    onClick={() => {
      setStep("login");
      setIsEmailChecked(false);
      setError("");
      setOtp("");
    }}
    className={ghostBtnClass}
  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back to login
                  </button>
                </form>}

              {
    /* ================================================= */
  }
              {
    /* NORMAL SET PASSWORD */
  }
              {
    /* ================================================= */
  }

              {step === "set-password" && <form onSubmit={handleSetPassword} className="space-y-4">
                  <div>
                    <label className={labelClass}>New password</label>
                    <div className="relative group">
                      <KeyRound className="w-4 h-4 text-[#9AA3B2] group-focus-within:text-[#2A3140] absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                      <input
    type={showNewPassword ? "text" : "password"}
    required
    minLength={6}
    autoFocus
    value={newPassword}
    onChange={(e) => setNewPassword(e.target.value)}
    placeholder="Min. 6 characters"
    className={fieldClassWithToggle}
  />
                      <button
    type="button"
    onClick={() => setShowNewPassword((v) => !v)}
    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9AA3B2] hover:text-[#1A1D26] transition-colors p-1 cursor-pointer"
    aria-label={showNewPassword ? "Hide password" : "Show password"}
  >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Confirm password</label>
                    <div className="relative group">
                      <Lock className="w-4 h-4 text-[#9AA3B2] group-focus-within:text-[#2A3140] absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                      <input
    type={showConfirmPassword ? "text" : "password"}
    required
    minLength={6}
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    placeholder="Re-enter password"
    className={fieldClassWithToggle}
  />
                      <button
    type="button"
    onClick={() => setShowConfirmPassword((v) => !v)}
    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9AA3B2] hover:text-[#1A1D26] transition-colors p-1 cursor-pointer"
    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
  >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
    type="submit"
    disabled={isLoading}
    className={primaryBtnClass}
  >
                    {renderSubmitContent(
    "Save password & continue",
    "Saving password..."
  )}
                  </button>
                </form>}

              {
    /* ================================================= */
  }
              {
    /* FORGOT PASSWORD - EMAIL */
  }
              {
    /* ================================================= */
  }

              {step === "forgot-password" && <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className={labelClass}>Email address</label>
                    <div className="relative group">
                      <Mail className="w-4 h-4 text-[#9AA3B2] group-focus-within:text-[#2A3140] absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                      <input
    type="email"
    required
    autoFocus
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="owner@restaurant.com"
    className={fieldClass}
  />
                    </div>
                  </div>

                  <button
    type="submit"
    disabled={isLoading}
    className={primaryBtnClass}
  >
                    {renderSubmitContent("Send reset code", "Sending code...")}
                  </button>

                  <button
    type="button"
    onClick={() => {
      setStep("login");
      setIsEmailChecked(false);
      setPassword("");
      setError("");
    }}
    className={ghostBtnClass}
  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back to login
                  </button>
                </form>}

              {
    /* ================================================= */
  }
              {
    /* FORGOT PASSWORD - OTP */
  }
              {
    /* ================================================= */
  }

              {step === "forgot-otp" && <form onSubmit={handleVerifyForgotOtp} className="space-y-4">
                  <div>
                    <label className={labelClass}>Reset code</label>
                    <OtpBoxes
    value={forgotOtp}
    onChange={setForgotOtp}
    disabled={isLoading}
    autoFocus
  />
                  </div>

                  <button
    type="submit"
    title="Verify Reset OTP"
    disabled={isLoading || forgotOtp.length < OTP_LENGTH}
    className={primaryBtnClass}
  >
                    {renderSubmitContent("Verify reset code", "Verifying...")}
                  </button>

                  <button
    type="button"
    title="Resend OTP"
    onClick={handleResendForgotOtp}
    disabled={isLoading}
    className={secondaryBtnClass}
  >
                    <RefreshCw
    className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
  />
                    Resend code
                  </button>

                  <button
    type="button"
    onClick={() => {
      setStep("forgot-password");
      setForgotOtp("");
      setError("");
    }}
    className={ghostBtnClass}
  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Change email
                  </button>
                </form>}

              {
    /* ================================================= */
  }
              {
    /* FORGOT PASSWORD - RESET */
  }
              {
    /* ================================================= */
  }

              {step === "reset-password" && <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className={labelClass}>New password</label>
                    <div className="relative group">
                      <KeyRound className="w-4 h-4 text-[#9AA3B2] group-focus-within:text-[#2A3140] absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                      <input
    type={showNewPassword ? "text" : "password"}
    required
    minLength={6}
    autoFocus
    value={newPassword}
    onChange={(e) => setNewPassword(e.target.value)}
    placeholder="Create a new password"
    className={fieldClassWithToggle}
  />
                      <button
    type="button"
    onClick={() => setShowNewPassword((v) => !v)}
    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9AA3B2] hover:text-[#1A1D26] transition-colors p-1 cursor-pointer"
    aria-label={showNewPassword ? "Hide password" : "Show password"}
  >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Confirm new password</label>
                    <div className="relative group">
                      <Lock className="w-4 h-4 text-[#9AA3B2] group-focus-within:text-[#2A3140] absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                      <input
    type={showConfirmPassword ? "text" : "password"}
    required
    minLength={6}
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    placeholder="Confirm new password"
    className={fieldClassWithToggle}
  />
                      <button
    type="button"
    onClick={() => setShowConfirmPassword((v) => !v)}
    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9AA3B2] hover:text-[#1A1D26] transition-colors p-1 cursor-pointer"
    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
  >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
    type="submit"
    disabled={isLoading}
    className={primaryBtnClass}
  >
                    {renderSubmitContent("Reset password", "Resetting...")}
                  </button>

                  <button
    type="button"
    onClick={() => {
      setStep("login");
      setIsEmailChecked(false);
      setPassword("");
      setForgotOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
    }}
    className={ghostBtnClass}
  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back to login
                  </button>
                </form>}
          </div>

          {
    /* Security note */
  }
          <div className="mt-10 pt-6 border-t border-[#E6EAF2]">
            <div className="flex items-center gap-2 text-[12px] text-[#8B93A7]">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Protected with enterprise-grade security</span>
            </div>
          </div>

          {
    /* Store link */
  }
          <div className="mt-5">
            <button
    onClick={onGoToStore}
    className="text-[13px] text-[#8B93A7] hover:text-[#1A1D26] inline-flex items-center gap-2 transition-colors cursor-pointer"
  >
              <Store className="w-3.5 h-3.5" />
              <span>Back to customer storefront</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes login-fade {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>;
};
export {
  AdminLoginPage
};
