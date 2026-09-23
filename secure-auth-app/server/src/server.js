const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { createClient } = require("@supabase/supabase-js");

const {
  verifyEmailConnection,
  sendOtpEmail,
} = require("./email");

const {
  upsertProfile,
  recordAuthEvent,
} = require("./supabaseService");

const {
  createLoginChallenge,
  verifyLoginChallenge,
  resendLoginChallenge,
  cleanupExpiredChallenges,
} = require("./loginEmailChallenge");

const {
  createSignupChallenge,
  verifySignupChallenge,
  resendSignupChallenge,
} = require("./signupEmailChallenge");

const {
  createSupabaseServerClient,
} = require("./supabaseServer");

// Canonical Supabase admin / auth client
const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabasePublishableKey || !supabaseSecretKey) {
  throw new Error("Supabase environment configuration is incomplete in server/.env");
}

const supabaseAuth = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const CLIENT_ORIGINS = (
  process.env.CLIENT_ORIGINS ||
  process.env.CLIENT_ORIGIN ||
  "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: CLIENT_ORIGINS,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Prevent public caching on all dynamic auth routes
function setNoCacheHeaders(res) {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  res.setHeader("Pragma", "no-cache");
}

// Auth Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Helper to set auth cookies securely
function setAuthCookies(res, session) {
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  res.cookie("sb-access-token", session.access_token, cookieOptions);
  res.cookie("sb-refresh-token", session.refresh_token, cookieOptions);
}

// Helper to clear auth cookies
function clearAuthCookies(req, res) {
  const clearOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  };

  res.clearCookie("sb-access-token", clearOptions);
  res.clearCookie("sb-refresh-token", clearOptions);
  res.clearCookie("session", clearOptions);

  // Clear any @supabase/ssr generated cookies
  Object.keys(req.cookies || {}).forEach((name) => {
    if (name.startsWith("sb-")) {
      res.clearCookie(name, clearOptions);
    }
  });
}

// Helper to get authenticated user from cookies or Bearer header
async function getAuthenticatedUser(req, res) {
  const accessToken =
    req.cookies?.["sb-access-token"] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const refreshToken = req.cookies?.["sb-refresh-token"];

  if (!accessToken && !refreshToken) {
    try {
      const ssrClient = createSupabaseServerClient(req, res);
      const { data: { user }, error } = await ssrClient.auth.getUser();
      if (!error && user) return user;
    } catch {
      // ignore
    }
    return null;
  }

  // 1. Verify access token with Supabase Auth
  if (accessToken) {
    const { data, error } = await supabaseAuth.auth.getUser(accessToken);
    if (!error && data?.user) {
      return data.user;
    }
  }

  // 2. If access token expired but refresh token exists, refresh session
  if (refreshToken) {
    const { data, error } = await supabaseAuth.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (!error && data?.session && data?.user) {
      setAuthCookies(res, data.session);
      return data.user;
    }
  }

  return null;
}

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Authentication server is running",
    timestamp: new Date().toISOString(),
  });
});

// Database connectivity check via Supabase
app.get("/api/health/db", async (req, res) => {
  try {
    const { count, error } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    res.json({
      success: true,
      message: "Supabase PostgreSQL connected successfully",
      profilesCount: count,
    });
  } catch (error) {
    console.error("Database health check error:", error.message);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// ==========================================
// SIGNUP — CUSTOM 6-DIGIT EMAIL OTP FLOW
// ==========================================

function maskEmail(email) {
  if (!email || !email.includes("@")) return email;
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}${user[1]}***${user[user.length - 1]}@${domain}`;
}

app.post("/api/auth/signup", authLimiter, async (req, res) => {
  setNoCacheHeaders(res);
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Create Supabase Auth user with admin client without sending confirmation link (email_confirm: false)
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: false,
        user_metadata: {
          name: normalizedName,
        },
      });

    if (userError) {
      console.error("Supabase admin createUser error:", userError.message);
      const lowerMessage = userError.message.toLowerCase();

      if (
        lowerMessage.includes("already registered") ||
        lowerMessage.includes("already exists") ||
        lowerMessage.includes("already been registered")
      ) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists.",
        });
      }

      return res.status(400).json({
        success: false,
        message: userError.message,
      });
    }

    const user = userData.user;

    // Create 6-digit OTP challenge server-side
    const { challenge, otp } = await createSignupChallenge(user);

    // Dispatch OTP email via custom Nodemailer/Brevo SMTP
    try {
      await sendOtpEmail(normalizedEmail, otp, "signup");
    } catch (emailError) {
      console.error("Signup OTP email dispatch failed:", emailError.message);
      return res.status(503).json({
        success: false,
        message: "Unable to send the verification code. Please try again.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Verification code sent to your email.",
      challengeId: challenge.id,
      email: maskEmail(normalizedEmail),
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
});

// ==========================================
// VERIFY SIGNUP OTP
// ==========================================

app.post("/api/auth/verify-signup-otp", authLimiter, async (req, res) => {
  setNoCacheHeaders(res);

  try {
    const { challengeId, otp } = req.body || {};

    if (
      typeof challengeId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(challengeId) ||
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid six-digit verification code.",
      });
    }

    const { challenge } = await verifySignupChallenge(challengeId, otp);

    // Confirm email in Supabase Auth via admin client
    const { data: updatedUser, error: confirmError } =
      await supabaseAdmin.auth.admin.updateUserById(challenge.user_id, {
        email_confirm: true,
      });

    if (confirmError) {
      console.error("Admin confirm email error:", confirmError.message);
      return res.status(500).json({
        success: false,
        message: "Failed to confirm account. Please try again.",
      });
    }

    // Upsert profile in public.profiles using auth.users.id
    try {
      await upsertProfile({
        id: updatedUser.user.id,
        name: updatedUser.user.user_metadata?.name || "",
        email: updatedUser.user.email,
        email_verified: true,
      });
    } catch (profileError) {
      console.error("Profile upsert warning:", profileError.message);
    }

    // Record auth_events entry (safe fallback)
    try {
      await recordAuthEvent(
        {
          id: updatedUser.user.id,
          name: updatedUser.user.user_metadata?.name || "",
          email: updatedUser.user.email,
          email_verified: true,
        },
        "login"
      );
    } catch {
      // Ignored if constraint restricts event_type
    }

    return res.json({
      success: true,
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error) {
    const messages = {
      OTP_NOT_FOUND: "No active code found. Please request a new code.",
      OTP_EXPIRED: "This code has expired. Please request a new code.",
      OTP_INVALID: "Invalid verification code.",
      OTP_TOO_MANY_ATTEMPTS:
        "Too many incorrect attempts. Please request a new code.",
      CHALLENGE_INVALID:
        "This verification request has expired. Please sign up again.",
    };

    const status =
      error.message === "OTP_TOO_MANY_ATTEMPTS" ? 429 : 400;

    return res.status(status).json({
      success: false,
      message: messages[error.message] || "Unable to verify the code.",
    });
  }
});

// Backward compatibility alias for /api/auth/verify-email
app.post("/api/auth/verify-email", authLimiter, async (req, res) => {
  return app._router.handle(
    Object.assign(req, { url: "/api/auth/verify-signup-otp" }),
    res
  );
});

// ==========================================
// RESEND SIGNUP OTP
// ==========================================

app.post("/api/auth/resend-signup-otp", authLimiter, async (req, res) => {
  setNoCacheHeaders(res);

  try {
    const { challengeId } = req.body || {};

    if (
      typeof challengeId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(challengeId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification request.",
      });
    }

    const { email, otp } = await resendSignupChallenge(challengeId);

    await sendOtpEmail(email, otp, "signup");

    return res.json({
      success: true,
      message: "A new verification code has been sent to your email.",
    });
  } catch (error) {
    if (error.message === "OTP_COOLDOWN") {
      return res.status(429).json({
        success: false,
        message: "Please wait 60 seconds before requesting another code.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "This verification request has expired. Please sign up again.",
    });
  }
});

// ==========================================
// LOGIN (STEP 1: PASSWORD -> SERVER 6-DIGIT EMAIL OTP)
// ==========================================

app.post("/api/auth/login", authLimiter, async (req, res) => {
  setNoCacheHeaders(res);

  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify email + password with Supabase Auth
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data?.session || !data?.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = data.user;
    const session = data.session;

    if (!user.email_confirmed_at) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
      });
    }

    // Require fresh 6-digit email OTP on EVERY login
    // Store HMAC-hashed challenge in public.login_email_challenges
    // Encrypt session server-side
    const { challenge, otp } = await createLoginChallenge(user, session);

    // Dispatch OTP email via server SMTP
    try {
      await sendOtpEmail(normalizedEmail, otp, "login");
    } catch (emailError) {
      console.error("Login OTP email dispatch failed:", emailError.message);
      return res.status(503).json({
        success: false,
        message: "Unable to send the verification code. Please try again.",
      });
    }

    // Browser receives ONLY opaque challengeId
    return res.json({
      success: true,
      message: "Verification code sent to your email.",
      challengeId: challenge.id,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
});

// ==========================================
// VERIFY LOGIN OTP (STEP 2: OTP -> ESTABLISH SESSION)
// ==========================================

app.post("/api/auth/verify-login-otp", authLimiter, async (req, res) => {
  setNoCacheHeaders(res);

  try {
    const { challengeId, otp } = req.body || {};

    if (
      typeof challengeId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(challengeId) ||
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid six-digit verification code.",
      });
    }

    const { challenge, session } = await verifyLoginChallenge(challengeId, otp);

    // Verify session tokens with Supabase
    const { data, error } = await supabaseAuth.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (error || !data?.session || !data?.user) {
      return res.status(401).json({
        success: false,
        message:
          "Your login session could not be established. Please sign in again.",
      });
    }

    const user = data.user;

    // Sync profile in public.profiles
    const profile = await upsertProfile(user);

    // Record login in public.auth_events server-side
    await recordAuthEvent(
      {
        ...user,
        name: user.user_metadata?.name || profile?.name || "",
      },
      "login"
    );

    // Establish official Supabase authenticated session via secure HTTP-only cookies
    setAuthCookies(res, data.session);

    // Also prime @supabase/ssr server client if available
    try {
      const ssrClient = createSupabaseServerClient(req, res);
      await ssrClient.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    } catch {
      // primary cookies are already set
    }

    return res.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.user_metadata?.name || profile?.name || "",
        email: user.email,
        email_verified: Boolean(user.email_confirmed_at),
      },
    });
  } catch (error) {
    const messages = {
      OTP_NOT_FOUND: "No active code found. Please request a new code.",
      OTP_EXPIRED: "This code has expired. Please request a new code.",
      OTP_INVALID: "Invalid verification code.",
      OTP_TOO_MANY_ATTEMPTS:
        "Too many incorrect attempts. Please request a new code.",
      CHALLENGE_INVALID:
        "This login request has expired. Please sign in again.",
    };

    const status =
      error.message === "OTP_TOO_MANY_ATTEMPTS"
        ? 429
        : 400;

    return res.status(status).json({
      success: false,
      message: messages[error.message] || "Unable to verify the code.",
    });
  }
});

// ==========================================
// RESEND LOGIN OTP
// ==========================================

app.post("/api/auth/resend-login-otp", authLimiter, async (req, res) => {
  setNoCacheHeaders(res);

  try {
    const { challengeId } = req.body || {};

    if (
      typeof challengeId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(challengeId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid login request.",
      });
    }

    const { email, otp } = await resendLoginChallenge(challengeId);

    await sendOtpEmail(email, otp, "login");

    return res.json({
      success: true,
      message: "A new login code has been sent.",
    });
  } catch (error) {
    if (error.message === "OTP_COOLDOWN") {
      return res.status(429).json({
        success: false,
        message: "Please wait 60 seconds before requesting another code.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "This login request has expired. Please sign in again.",
    });
  }
});

// ==========================================
// PASSWORD RESET (SUPABASE AUTH CANONICAL)
// ==========================================

app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
  setNoCacheHeaders(res);
  const genericMessage =
    "If the account exists, a password reset link has been sent.";

  try {
    const { email } = req.body || {};

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const redirectUrl = CLIENT_ORIGINS[0] || "http://localhost:5173";

    await supabaseAuth.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectUrl,
    });

    return res.json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error("Password reset error:", error.message);
    return res.json({
      success: true,
      message: genericMessage,
    });
  }
});

// ==========================================
// LOGOUT (SUPABASE AUTH CANONICAL)
// ==========================================

app.post("/api/auth/logout", async (req, res) => {
  setNoCacheHeaders(res);

  try {
    const user = await getAuthenticatedUser(req, res);

    if (user?.id) {
      try {
        await recordAuthEvent(user, "logout");
      } catch (eventError) {
        console.error("Logout event record error:", eventError.message);
      }

      try {
        await supabaseAdmin.auth.admin.signOut(user.id);
      } catch {
        // ignore
      }
    }

    clearAuthCookies(req, res);

    return res.json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    console.error("Logout error:", error.message);
    clearAuthCookies(req, res);
    return res.json({
      success: true,
      message: "Logout completed.",
    });
  }
});

// ==========================================
// GET CURRENT USER (/api/auth/me)
// ==========================================

app.get("/api/auth/me", async (req, res) => {
  setNoCacheHeaders(res);

  try {
    const user = await getAuthenticatedUser(req, res);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated.",
      });
    }

    // Fetch profile from Supabase PostgreSQL
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, email_verified, created_at")
      .eq("id", user.id)
      .maybeSingle();

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: profile?.name || user.user_metadata?.name || "",
        email: profile?.email || user.email,
        email_verified: Boolean(
          profile?.email_verified ?? user.email_confirmed_at
        ),
        created_at: profile?.created_at || user.created_at,
      },
    });
  } catch (error) {
    console.error("Session verification error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, async () => {
  console.log("----------------------------------------");
  console.log("VigilNODE Supabase Authentication Server");
  console.log(`Server running on port ${PORT}`);
  console.log("----------------------------------------");

  try {
    await verifyEmailConnection();
  } catch (error) {
    console.error("Email service connection failed:", error.message);
  }

  // Periodic challenge cleanup every 30 minutes
  setInterval(() => {
    cleanupExpiredChallenges().catch(() => {});
  }, 30 * 60 * 1000);
});
