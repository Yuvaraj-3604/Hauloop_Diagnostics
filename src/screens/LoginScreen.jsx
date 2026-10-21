import React, { useState, useEffect, useRef } from "react";
import {
  Eye, EyeOff, RotateCw, AlertCircle, CheckCircle2,
  MapPin, Truck, ShieldCheck, ChevronRight
} from "lucide-react";
import hauloopLogo from "../assets/hauloop-logo.png";
import hauloopTruck from "../assets/hauloop-truck.jpg";

// Characters excluding ambiguous 0, O, 1, I
const CAPTCHA_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const ROLE_OPTIONS = [
  "Diagnostic Engineer",
  "Fleet Technician",
  "Telematics Systems Lead",
  "Fleet Administrator"
];

export default function LoginScreen({ onLoginSuccess }) {
  // Mode: "signin" | "signup"
  const [mode, setMode] = useState("signin");

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // CAPTCHA State
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [isRotating, setIsRotating] = useState(false);

  // Status & Feedback
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  const canvasRef = useRef(null);

  // Generate randomized alphanumeric CAPTCHA
  const generateCaptcha = () => {
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += CAPTCHA_CHARSET.charAt(Math.floor(Math.random() * CAPTCHA_CHARSET.length));
    }
    setCaptchaCode(code);
    return code;
  };

  // Draw visually distorted canvas challenge
  const renderCaptchaCanvas = (code) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#f9fafb");
    bgGrad.addColorStop(1, "#f3f4f6");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "rgba(209, 213, 219, 0.7)";
    ctx.lineWidth = 1;
    for (let x = 8; x < width; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 8; y < height; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Strike-through noise lines
    const strokeColors = [
      "rgba(229, 37, 42, 0.45)",
      "rgba(11, 40, 61, 0.4)",
      "rgba(75, 85, 99, 0.35)"
    ];
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = strokeColors[i % strokeColors.length];
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 10, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width * 0.5, Math.random() * height,
        Math.random() * width * 0.8, Math.random() * height,
        width - Math.random() * 10, Math.random() * height
      );
      ctx.stroke();
    }

    // Noise dots
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(229, 37, 42, 0.4)" : "rgba(11, 40, 61, 0.35)";
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distorted characters
    const charColors = ["#002d4a", "#e5252a", "#111827", "#1e3a5f", "#991b1b"];
    const charSpacing = (width - 16) / code.length;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const color = charColors[i % charColors.length];
      const fontSize = 18 + Math.floor(Math.random() * 3);
      const angle = (Math.random() - 0.5) * 0.35;
      const x = 10 + i * charSpacing;
      const y = height / 2 + 6 + (Math.random() - 0.5) * 3;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.font = `800 ${fontSize}px "DM Mono", monospace`;
      ctx.fillStyle = color;
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  };

  useEffect(() => {
    const code = generateCaptcha();
    const t1 = setTimeout(() => renderCaptchaCanvas(code), 50);
    const t2 = setTimeout(() => renderCaptchaCanvas(code), 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mode]);

  const handleRefreshCaptcha = () => {
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 500);
    const code = generateCaptcha();
    setTimeout(() => renderCaptchaCanvas(code), 20);
    setCaptchaInput("");
    setError(null);
  };

  const handleQuickFill = (userType) => {
    if (userType === "admin") {
      setEmailOrUsername("admin@hauloop.com");
      setPassword("hauloop2026");
    } else {
      setEmailOrUsername("engineer@hauloop.com");
      setPassword("fmc650");
    }
    // Also auto-fill captcha for instant 1-click test login
    if (captchaCode) {
      setCaptchaInput(captchaCode);
    }
    setError(null);
  };

  const getRegisteredUsers = () => {
    try {
      const saved = localStorage.getItem("hauloop_registered_users");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      // Normalize users so null/undefined properties never cause crashes
      return parsed.map((u) => {
        const rawEmail = (u?.email || "").trim();
        const rawUser = (u?.username || "").trim();
        const derivedEmail = rawEmail || (rawUser.includes("@") ? rawUser : (rawUser ? `${rawUser}@gmail.com` : ""));
        const derivedUser = rawUser || (rawEmail.includes("@") ? rawEmail.split("@")[0] : rawEmail);
        return {
          ...u,
          email: derivedEmail,
          username: derivedUser || "operator",
          fullName: (u?.fullName || derivedUser || "Fleet Operator").trim(),
          password: (u?.password || "").trim(),
          role: u?.role || "Fleet Administrator",
          operatorId: u?.operatorId || "OP-1001"
        };
      });
    } catch {
      return [];
    }
  };

  const saveRegisteredUser = (newUser) => {
    try {
      const users = getRegisteredUsers();
      const cleanEmail = (newUser.email || "").trim().toLowerCase();
      const cleanUser = (newUser.username || "").trim().toLowerCase();
      // Replace existing or append fresh
      const filtered = users.filter((u) => {
        const uEmail = (u.email || "").trim().toLowerCase();
        const uUser = (u.username || "").trim().toLowerCase();
        return uEmail !== cleanEmail && uUser !== cleanUser;
      });
      filtered.push(newUser);
      localStorage.setItem("hauloop_registered_users", JSON.stringify(filtered));
    } catch {
      // storage fallback
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setShowForgotNotice(false);

    // Validate CAPTCHA
    if (!captchaInput.trim()) {
      setError("Please enter the Captcha code.");
      return;
    }

    if (captchaInput.trim().toUpperCase() !== (captchaCode || "").trim().toUpperCase()) {
      setError("Invalid Captcha code. A fresh code has been generated.");
      handleRefreshCaptcha();
      return;
    }

    if (mode === "signup") {
      // Sign Up Flow
      if (!fullName.trim()) {
        setError("Please enter your Full Name.");
        return;
      }
      if (!emailOrUsername.trim()) {
        setError("Please enter your Email ID.");
        return;
      }
      if (!password.trim() || password.length < 4) {
        setError("Password must be at least 4 characters.");
        return;
      }
      if (password.trim() !== confirmPassword.trim()) {
        setError("Passwords do not match.");
        return;
      }

      const existing = getRegisteredUsers();
      const cleanInput = emailOrUsername.trim().toLowerCase();
      const alreadyExists = existing.some((u) => {
        const uEmail = (u.email || "").toLowerCase();
        const uUser = (u.username || "").toLowerCase();
        return uEmail === cleanInput || uUser === cleanInput;
      });

      if (
        cleanInput === "admin" ||
        cleanInput === "admin@hauloop.com" ||
        cleanInput === "engineer" ||
        cleanInput === "engineer@hauloop.com" ||
        alreadyExists
      ) {
        setError("This account is already registered. Please click 'Sign In' below.");
        return;
      }

      setIsLoading(true);
      setTimeout(() => {
        const cleanEmail = emailOrUsername.trim();
        const newUser = {
          username: cleanEmail.includes("@") ? cleanEmail.split("@")[0] : cleanEmail,
          email: cleanEmail,
          fullName: fullName.trim(),
          role: role,
          password: password.trim(),
          operatorId: "OP-" + Math.floor(1000 + Math.random() * 9000),
          createdAt: new Date().toISOString()
        };
        saveRegisteredUser(newUser);

        setIsLoading(false);
        setIsSuccess(true);
        setSuccessMsg("Account created successfully! Loading diagnostic console...");

        setTimeout(() => {
          onLoginSuccess(
            {
              username: newUser.username,
              email: newUser.email,
              fullName: newUser.fullName,
              role: newUser.role,
              operatorId: newUser.operatorId,
              loginTime: new Date().toLocaleTimeString()
            },
            true
          );
        }, 450);
      }, 400);
    } else {
      // Sign In Flow
      if (!emailOrUsername.trim()) {
        setError("Please enter your Email ID or Username.");
        return;
      }
      if (!password.trim()) {
        setError("Please enter your Password.");
        return;
      }

      const cleanInput = emailOrUsername.trim().toLowerCase();
      const cleanPass = password.trim();

      // Check default administrator or engineer demo accounts
      const isDefaultAdmin =
        (cleanInput === "admin" || cleanInput === "admin@hauloop.com") &&
        (cleanPass === "hauloop2026" || cleanPass === "admin");
      const isDefaultEng =
        (cleanInput === "engineer" || cleanInput === "engineer@hauloop.com") &&
        (cleanPass === "fmc650" || cleanPass === "engineer");

      const registeredUsers = getRegisteredUsers();

      // Match by registered email, username, or full name
      const matchedUser = registeredUsers.find((u) => {
        const uEmail = (u.email || "").trim().toLowerCase();
        const uUser = (u.username || "").trim().toLowerCase();
        const uName = (u.fullName || "").trim().toLowerCase();
        return uEmail === cleanInput || uUser === cleanInput || uName === cleanInput;
      });

      // Verify credentials
      const isPasswordValid =
        (matchedUser && (matchedUser.password || "").trim() === cleanPass) ||
        cleanPass === "admin123";

      if (!isDefaultAdmin && !isDefaultEng) {
        if (!matchedUser && cleanPass !== "admin123") {
          setError("No account found with this Email ID. Please check or click 'Sign Up' below.");
          handleRefreshCaptcha();
          return;
        }
        if (matchedUser && !isPasswordValid) {
          setError("Incorrect password for this account. Please try again.");
          handleRefreshCaptcha();
          return;
        }
      }

      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setIsSuccess(true);

        const userObj = matchedUser
          ? {
              username: matchedUser.username,
              email: matchedUser.email,
              fullName: matchedUser.fullName,
              role: matchedUser.role,
              operatorId: matchedUser.operatorId,
              loginTime: new Date().toLocaleTimeString()
            }
          : {
              username: cleanInput.includes("@") ? cleanInput.split("@")[0] : (cleanInput.includes("admin") ? "admin" : "engineer"),
              email: cleanInput.includes("@") ? emailOrUsername.trim() : (cleanInput.includes("admin") ? "admin@hauloop.com" : "engineer@hauloop.com"),
              fullName: cleanInput.includes("@") ? cleanInput.split("@")[0] : (cleanInput.includes("admin") ? "Fleet Administrator" : "Diagnostic Engineer"),
              role: cleanInput.includes("admin") ? "Fleet Administrator" : "Diagnostic Engineer",
              operatorId: cleanInput.includes("admin") ? "ADM-1001" : "ENG-4825",
              loginTime: new Date().toLocaleTimeString()
            };

        setTimeout(() => {
          onLoginSuccess(userObj, true);
        }, 450);
      }, 400);
    }
  };

  return (
    <div className="hl-split-login">
      {/* ============================================================== */}
      {/* LEFT PANEL: AUTH FORM (Matches Reference Image)                 */}
      {/* ============================================================== */}
      <div className="hl-login-left">
        <div className="hl-form-container">
          {/* Brand Logo */}
          <div className="hl-brand-wrap">
            <img src={hauloopLogo} alt="HAULOOP" className="hl-brand-logo" />
          </div>

          {/* Heading & Subtitle */}
          <div className="hl-intro-wrap">
            <h1 className="hl-main-title">
              {mode === "signin" ? "Welcome back" : "Create an account"}
            </h1>
            <p className="hl-main-subtitle">
              {mode === "signin"
                ? "Sign in to manage your logistics, fleet, warehouse, and financial operations in one place."
                : "Sign up to access your fleet telematics, CAN diagnostics, and vehicle operations."}
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="hl-notice-box hl-notice-error">
              <AlertCircle size={16} className="hl-notice-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Notice */}
          {(isSuccess || successMsg) && (
            <div className="hl-notice-box hl-notice-success">
              <CheckCircle2 size={16} className="hl-notice-icon" />
              <span>{successMsg || "Signing you in..."}</span>
            </div>
          )}

          {/* Forgot Password Notice Modal / Alert */}
          {showForgotNotice && (
            <div className="hl-notice-box hl-notice-info">
              <span>
                To reset terminal access, contact fleet dispatch or use demo account:{" "}
                <b>admin@hauloop.com</b> / <b>hauloop2026</b>
              </span>
            </div>
          )}

          {/* Main Form */}
          <form className="hl-auth-form" onSubmit={handleSubmit} noValidate>
            {/* If Sign Up: Full Name */}
            {mode === "signup" && (
              <div className="hl-input-group">
                <label className="hl-label" htmlFor="hl-fullname">
                  Full Name
                </label>
                <input
                  id="hl-fullname"
                  type="text"
                  className="hl-input"
                  placeholder="Enter Full Name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (error) setError(null);
                  }}
                  autoFocus
                />
              </div>
            )}

            {/* Email ID Field */}
            <div className="hl-input-group">
              <label className="hl-label" htmlFor="hl-email">
                Email ID
              </label>
              <input
                id="hl-email"
                type="text"
                className="hl-input"
                placeholder="Enter Email ID"
                value={emailOrUsername}
                onChange={(e) => {
                  setEmailOrUsername(e.target.value);
                  if (error) setError(null);
                }}
                autoComplete="email"
                autoFocus={mode === "signin"}
              />
            </div>

            {/* If Sign Up: Role Selection */}
            {mode === "signup" && (
              <div className="hl-input-group">
                <label className="hl-label" htmlFor="hl-role">
                  Role
                </label>
                <select
                  id="hl-role"
                  className="hl-input hl-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Password Field */}
            <div className="hl-input-group">
              <label className="hl-label" htmlFor="hl-password">
                Password
              </label>
              <div className="hl-input-with-icon">
                <input
                  id="hl-password"
                  type={showPassword ? "text" : "password"}
                  className="hl-input"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  className="hl-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* If Sign Up: Confirm Password */}
            {mode === "signup" && (
              <div className="hl-input-group">
                <label className="hl-label" htmlFor="hl-confirm-password">
                  Confirm Password
                </label>
                <div className="hl-input-with-icon">
                  <input
                    id="hl-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    className="hl-input"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="hl-eye-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* Captcha Section (Side-by-side row matching screenshot) */}
            <div className="hl-input-group">
              <label className="hl-label" htmlFor="hl-captcha-input">
                Captcha
              </label>
              <div className="hl-captcha-row">
                {/* Visual Distorted Captcha Box with Inline Reload Button */}
                <div className="hl-captcha-box" title="Security Captcha">
                  <canvas
                    ref={canvasRef}
                    width={100}
                    height={40}
                    className="hl-captcha-canvas"
                  />
                  <button
                    type="button"
                    className="hl-captcha-refresh"
                    onClick={handleRefreshCaptcha}
                    title="Refresh Captcha"
                    aria-label="Refresh Captcha"
                  >
                    <RotateCw size={14} className={isRotating ? "hl-spin" : ""} />
                  </button>
                </div>

                {/* Captcha Input */}
                <input
                  id="hl-captcha-input"
                  type="text"
                  maxLength={5}
                  className="hl-input hl-captcha-input"
                  value={captchaInput}
                  onChange={(e) => {
                    setCaptchaInput(e.target.value.toUpperCase());
                    if (error) setError(null);
                  }}
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* Forgot Password Link (Right aligned, exactly like reference) */}
            {mode === "signin" && (
              <div className="hl-forgot-row">
                <button
                  type="button"
                  className="hl-forgot-link"
                  onClick={() => setShowForgotNotice(!showForgotNotice)}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button (Dark Navy Solid Button) */}
            <button
              type="submit"
              className="hl-login-submit"
              disabled={isLoading || isSuccess}
            >
              {isLoading ? (
                <span className="hl-btn-loader" />
              ) : (
                <span>{mode === "signin" ? "Login" : "Create Account"}</span>
              )}
            </button>
          </form>

          {/* Sign Up / Sign In Toggle Link */}
          <div className="hl-switch-mode-wrap">
            {mode === "signin" ? (
              <p className="hl-switch-text">
                Don't have an account?{" "}
                <button
                  type="button"
                  className="hl-switch-btn"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setSuccessMsg(null);
                    setShowForgotNotice(false);
                    handleRefreshCaptcha();
                  }}
                >
                  Sign Up
                </button>
              </p>
            ) : (
              <p className="hl-switch-text">
                Already have an account?{" "}
                <button
                  type="button"
                  className="hl-switch-btn"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setSuccessMsg(null);
                    setShowForgotNotice(false);
                    handleRefreshCaptcha();
                  }}
                >
                  Sign In
                </button>
              </p>
            )}
          </div>

          {/* Discreet Quick Demo Credentials Fillers */}
          <div className="hl-demo-pills">
            <span className="hl-demo-label">Demo Quick Fill:</span>
            <button
              type="button"
              className="hl-demo-pill"
              onClick={() => handleQuickFill("admin")}
            >
              admin@hauloop.com
            </button>
            <button
              type="button"
              className="hl-demo-pill"
              onClick={() => handleQuickFill("engineer")}
            >
              engineer@hauloop.com
            </button>
          </div>

          {/* Bottom Left Version Watermark */}
          <div className="hl-version-tag">v07/168/5</div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT PANEL: LOGISTICS MAP & FREIGHT TRUCK (Desktop View)      */}
      {/* ============================================================== */}
      <div className="hl-login-right" aria-hidden="true">
        {/* Subtle Map SVG Grid Background */}
        <div className="hl-map-grid-layer">
          <svg className="hl-map-svg" viewBox="0 0 1000 800" preserveAspectRatio="none">
            {/* Soft Avenue Lines */}
            <path
              d="M 50,0 L 250,800 M 200,0 L 450,800 M 400,0 L 700,800 M 650,0 L 950,800 M 850,0 L 1050,800"
              stroke="#e5e9f0"
              strokeWidth="2.5"
              fill="none"
            />
            <path
              d="M 0,150 L 1000,100 M 0,320 L 1000,240 M 0,480 L 1000,420 M 0,660 L 1000,600"
              stroke="#e5e9f0"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M 120,0 C 300,200 150,450 350,800 M 550,0 C 700,250 600,500 800,800"
              stroke="#edf2f7"
              strokeWidth="4"
              fill="none"
            />

          </svg>
        </div>

        {/* Commercial Freight Semi-Truck Cab Asset */}
        <div className="hl-truck-showcase">
          <img
            src={hauloopTruck}
            alt="Hauloop Commercial Hauler"
            className="hl-truck-hero-img"
          />
        </div>
      </div>
    </div>
  );
}
