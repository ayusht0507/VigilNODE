import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import "./App.css";

const MODEL_APP_URL =
  import.meta.env.VITE_MODEL_APP_URL || "http://localhost:5174";

const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL || "http://localhost:5000";

export function formatTimestamp(isoOrDate) {
  if (!isoOrDate) return "";
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return String(isoOrDate);
  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  return `${day}-${month}-${year}, ${hours}:${mins}:${secs}`;
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 0 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m2 2 20 20" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    </svg>
  );
}

function Brand() {
  return (
    <header className="brand">
      <span>vigil</span>
      <strong>NODE</strong>
      <small>INTELLIGENCE PLATFORM</small>
    </header>
  );
}

function Notice({ message }) {
  return message ? (
    <p className="notice" role="alert">
      {message}
    </p>
  ) : null;
}

function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  showPassword,
  setShowPassword,
  required = true,
}) {
  return (
    <div className="password-field">
      <input
        id={id}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
      />

      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setShowPassword((current) => !current)}
        aria-label={showPassword ? "Hide password" : "Show password"}
        title={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function PasswordStrength({ password }) {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const strength =
    score <= 2 ? "Weak" : score <= 4 ? "Medium" : "Strong";

  return (
    <p className={`password-strength ${strength.toLowerCase()}`}>
      Password strength: <strong>{strength}</strong>
    </p>
  );
}

function OtpInput({ value, onChange }) {
  return (
    <input
      id="auth-code"
      className="otp-input"
      value={value}
      onChange={(event) =>
        onChange(event.target.value.replace(/\D/g, "").slice(0, 6))
      }
      onPaste={(event) => {
        event.preventDefault();
        const pasteData = (event.clipboardData || window.clipboardData).getData("text");
        const digits = pasteData.replace(/\D/g, "").slice(0, 6);
        if (digits) onChange(digits);
      }}
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="000000"
      aria-label="Six digit email verification code"
      autoFocus
      required
    />
  );
}

function App() {
  const [screen, setScreen] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Handle Supabase Auth state changes (e.g. PASSWORD_RECOVERY from email link)
  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setScreen("reset-password");
        setMessage("Enter your new VigilNODE password.");
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // 60-second OTP resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const show = (next, notice = "") => {
    setScreen(next);
    setMessage(notice);
    setCode("");
  };

  const fail = (error) => {
    setMessage(error?.message || "Unable to complete that request.");
  };

  async function apiRequest(path, body) {
    const response = await fetch(`${AUTH_API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      throw new Error(data?.message || "Request failed.");
    }

    return data;
  }

  async function signIn(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const data = await apiRequest("/api/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      setChallengeId(data.challengeId);
      setPassword("");
      setCode("");
      setCooldown(60);

      show(
        "verify-login-otp",
        "A six-digit verification code has been sent to your email."
      );
    } catch (error) {
      fail(error);
    } finally {
      setLoading(false);
    }
  }

  async function verifyLoginOtp(event) {
    event.preventDefault();

    if (code.length !== 6) {
      setMessage("Enter the six-digit verification code.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await apiRequest("/api/auth/verify-login-otp", {
        challengeId,
        otp: code,
      });

      window.location.assign(MODEL_APP_URL);
    } catch (error) {
      fail(error);
    } finally {
      setLoading(false);
    }
  }

  async function resendLoginOtp() {
    if (cooldown > 0) return;
    setLoading(true);
    setMessage("");

    try {
      const data = await apiRequest("/api/auth/resend-login-otp", {
        challengeId,
      });

      setMessage(data.message);
      setCode("");
      setCooldown(60);
    } catch (error) {
      fail(error);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(event) {
    event.preventDefault();

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const data = await apiRequest("/api/auth/signup", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      setChallengeId(data.challengeId);
      setPassword("");
      setConfirmPassword("");
      setCode("");
      setCooldown(60);

      show(
        "verify-signup-otp",
        data.message || "A six-digit verification code has been sent to your email."
      );
    } catch (error) {
      fail(error);
    } finally {
      setLoading(false);
    }
  }

  async function verifySignupOtp(event) {
    event.preventDefault();

    if (code.length !== 6) {
      setMessage("Enter the six-digit verification code.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const data = await apiRequest("/api/auth/verify-signup-otp", {
        challengeId,
        otp: code,
      });

      setCode("");
      show("login", data.message || "Email verified successfully! You can now sign in.");
    } catch (error) {
      fail(error);
    } finally {
      setLoading(false);
    }
  }

  async function resendSignupOtp() {
    if (cooldown > 0) return;
    setLoading(true);
    setMessage("");

    try {
      const data = await apiRequest("/api/auth/resend-signup-otp", {
        challengeId,
      });

      setMessage(data.message);
      setCode("");
      setCooldown(60);
    } catch (error) {
      fail(error);
    } finally {
      setLoading(false);
    }
  }

  async function requestReset(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          {
            redirectTo: window.location.origin,
          }
        );
        if (error) throw error;
      } else {
        await apiRequest("/api/auth/forgot-password", {
          email: email.trim().toLowerCase(),
        });
      }

      show(
        "reset-sent",
        "If an account exists for that address, a recovery email has been sent."
      );
    } catch (error) {
      fail(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(event) {
    event.preventDefault();

    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (!supabase) {
        throw new Error("Supabase Auth client not configured.");
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword("");
      setConfirmNewPassword("");
      show("login", "Password updated successfully. Please sign in with your new password.");
    } catch (error) {
      fail(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <Brand />

      <section className="auth-card">
        {screen === "login" && (
          <>
            <h1>System Access</h1>
            <p className="subtitle">Secure access to VigilNODE intelligence.</p>

            <Notice message={message} />

            <form onSubmit={signIn}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter email address"
                autoComplete="email"
                required
              />

              <div className="label-row">
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className="link"
                  onClick={() => show("forgot")}
                >
                  Forgot Password?
                </button>
              </div>

              <PasswordField
                id="password"
                value={password}
                onChange={setPassword}
                placeholder="Enter password"
                autoComplete="current-password"
                showPassword={showLoginPassword}
                setShowPassword={setShowLoginPassword}
              />

              <button disabled={loading}>
                {loading ? "Authenticating..." : "Authenticate"}
              </button>
            </form>

            <p className="switch">
              New to VigilNODE?{" "}
              <button className="link" onClick={() => show("signup")}>
                Create account
              </button>
            </p>
          </>
        )}

        {screen === "verify-login-otp" && (
          <>
            <h1>Verify your login</h1>
            <p className="subtitle">
              Enter the six-digit verification code sent to <strong>{email}</strong>.
            </p>

            <Notice message={message} />

            <form onSubmit={verifyLoginOtp}>
              <label htmlFor="auth-code">Email verification code</label>
              <OtpInput value={code} onChange={setCode} />

              <button disabled={loading || code.length !== 6}>
                {loading ? "Verifying..." : "Verify"}
              </button>
            </form>

            <button
              type="button"
              className="link back"
              disabled={loading || cooldown > 0}
              onClick={resendLoginOtp}
            >
              {cooldown > 0
                ? `Resend code in ${cooldown}s`
                : "Resend verification code"}
            </button>

            <button
              type="button"
              className="link back"
              onClick={() => show("login")}
            >
              Back to sign in
            </button>
          </>
        )}

        {screen === "signup" && (
          <>
            <h1>Create account</h1>
            <p className="subtitle">Secure access to VigilNODE intelligence.</p>

            <Notice message={message} />

            <form onSubmit={signUp}>
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                autoComplete="name"
                required
              />

              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter email address"
                autoComplete="email"
                required
              />

              <label htmlFor="signup-password">Password</label>
              <PasswordField
                id="signup-password"
                value={password}
                onChange={setPassword}
                placeholder="Create a password"
                autoComplete="new-password"
                showPassword={showSignupPassword}
                setShowPassword={setShowSignupPassword}
              />
              <PasswordStrength password={password} />

              <label htmlFor="confirm-password">Confirm password</label>
              <PasswordField
                id="confirm-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm your password"
                autoComplete="new-password"
                showPassword={showConfirmPassword}
                setShowPassword={setShowConfirmPassword}
              />

              <button disabled={loading}>
                {loading ? "Creating..." : "Create Account"}
              </button>
            </form>

            <p className="switch">
              Already registered?{" "}
              <button className="link" onClick={() => show("login")}>
                Back to Login
              </button>
            </p>
          </>
        )}

        {screen === "verify-signup-otp" && (
          <>
            <h1>Verify your email</h1>
            <p className="subtitle">
              Enter the six-digit verification code sent to <strong>{email}</strong>.
            </p>

            <Notice message={message} />

            <form onSubmit={verifySignupOtp}>
              <label htmlFor="auth-code">Email verification code</label>
              <OtpInput value={code} onChange={setCode} />

              <button disabled={loading || code.length !== 6}>
                {loading ? "Verifying..." : "Verify & Complete Signup"}
              </button>
            </form>

            <button
              type="button"
              className="link back"
              disabled={loading || cooldown > 0}
              onClick={resendSignupOtp}
            >
              {cooldown > 0
                ? `Resend code in ${cooldown}s`
                : "Resend verification code"}
            </button>

            <button
              type="button"
              className="link back"
              onClick={() => show("signup")}
            >
              Back to signup
            </button>
          </>
        )}

        {screen === "forgot" && (
          <>
            <h1>Reset your password</h1>
            <p className="subtitle">
              We'll send a secure recovery link if the account exists.
            </p>

            <Notice message={message} />

            <form onSubmit={requestReset}>
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter email address"
                autoComplete="email"
                required
              />

              <button disabled={loading}>
                {loading ? "Sending..." : "Send recovery link"}
              </button>
            </form>

            <button
              type="button"
              className="link back"
              onClick={() => show("login")}
            >
              Back to sign in
            </button>
          </>
        )}

        {screen === "reset-sent" && (
          <>
            <h1>Check your inbox</h1>
            <Notice message={message} />
            <p className="subtitle">
              Follow the recovery link sent to your email to securely choose a new password.
            </p>

            <button onClick={() => show("login")}>
              Back to sign in
            </button>
          </>
        )}

        {screen === "reset-password" && (
          <>
            <h1>New Password</h1>
            <p className="subtitle">Choose a new secure password for VigilNODE.</p>

            <Notice message={message} />

            <form onSubmit={handleUpdatePassword}>
              <label htmlFor="new-password">New password</label>
              <PasswordField
                id="new-password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter new password"
                autoComplete="new-password"
                showPassword={showNewPassword}
                setShowPassword={setShowNewPassword}
              />
              <PasswordStrength password={newPassword} />

              <label htmlFor="confirm-new-password">Confirm new password</label>
              <PasswordField
                id="confirm-new-password"
                value={confirmNewPassword}
                onChange={setConfirmNewPassword}
                placeholder="Confirm new password"
                autoComplete="new-password"
                showPassword={showConfirmNewPassword}
                setShowPassword={setShowConfirmNewPassword}
              />

              <button disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>

            <button
              type="button"
              className="link back"
              onClick={() => show("login")}
            >
              Back to sign in
            </button>
          </>
        )}
      </section>

      <footer>
        © 2026 VigilNODE Intelligence. All rights reserved.
      </footer>
    </main>
  );
}

export default App;