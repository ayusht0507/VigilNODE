require("dotenv").config();

const crypto = require("crypto");
const supabase = require("./supabase");

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

function requireKey(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing from .env`);
  }

  return Buffer.from(value, "base64");
}

function createOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function hashOtp(otp) {
  const key = requireKey("LOGIN_OTP_HMAC_KEY");

  return crypto
    .createHmac("sha256", key)
    .update(otp, "utf8")
    .digest("hex");
}

function encryptSession(session) {
  const key = requireKey("LOGIN_CHALLENGE_ENCRYPTION_KEY");

  if (key.length !== 32) {
    throw new Error(
      "LOGIN_CHALLENGE_ENCRYPTION_KEY must decode to exactly 32 bytes"
    );
  }

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    key,
    iv
  );

  const plaintext = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

function decryptSession(value) {
  const key = requireKey("LOGIN_CHALLENGE_ENCRYPTION_KEY");

  if (key.length !== 32) {
    throw new Error(
      "LOGIN_CHALLENGE_ENCRYPTION_KEY must decode to exactly 32 bytes"
    );
  }

  const parts = String(value || "").split(".");

  if (parts.length !== 3) {
    throw new Error("INVALID_SESSION_CIPHERTEXT");
  }

  const [ivPart, authTagPart, ciphertextPart] = parts;

  const iv = Buffer.from(ivPart, "base64url");
  const authTag = Buffer.from(authTagPart, "base64url");
  const ciphertext = Buffer.from(ciphertextPart, "base64url");

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    iv
  );

  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  const session = JSON.parse(plaintext);

  if (
    typeof session.access_token !== "string" ||
    typeof session.refresh_token !== "string"
  ) {
    throw new Error("INVALID_SESSION_PAYLOAD");
  }

  return session;
}

async function getChallengeById(challengeId) {
  const { data: signupChal, error: signupErr } = await supabase
    .from("signup_email_challenges")
    .select("*")
    .eq("id", challengeId)
    .is("used_at", null)
    .maybeSingle();

  if (!signupErr && signupChal) {
    return { challenge: signupChal, table: "signup_email_challenges" };
  }

  const { data: loginChal, error: loginErr } = await supabase
    .from("login_email_challenges")
    .select("*")
    .eq("id", challengeId)
    .is("used_at", null)
    .maybeSingle();

  if (!loginErr && loginChal && loginChal.session_ciphertext === "SIGNUP_PENDING") {
    return { challenge: loginChal, table: "login_email_challenges" };
  }

  return { challenge: null, table: null };
}

async function createSignupChallenge(user) {
  if (!user || !user.id || !user.email) {
    throw new Error("AUTH_USER_REQUIRED");
  }

  const otp = createOtp();
  const email = user.email.toLowerCase();
  const expiresAt = new Date(
    Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
  ).toISOString();
  const sentAt = new Date().toISOString();
  const otp_hash = hashOtp(otp);

  const { data: signupData, error: signupError } = await supabase
    .from("signup_email_challenges")
    .insert({
      user_id: user.id,
      email: email,
      otp_hash: otp_hash,
      attempts: 0,
      max_attempts: OTP_MAX_ATTEMPTS,
      expires_at: expiresAt,
      created_at: sentAt,
      used_at: null,
    })
    .select("id,email,expires_at,created_at")
    .single();

  if (!signupError && signupData) {
    return { challenge: signupData, otp: otp };
  }

  const { data: loginData, error: loginError } = await supabase
    .from("login_email_challenges")
    .insert({
      user_id: user.id,
      email: email,
      otp_hash: otp_hash,
      session_ciphertext: "SIGNUP_PENDING",
      expires_at: expiresAt,
      sent_at: sentAt,
      attempts: 0,
      used_at: null,
    })
    .select("id,email,expires_at,sent_at")
    .single();

  if (loginError) {
    console.error("Create signup challenge error:", loginError.message);
    throw loginError;
  }

  return { challenge: loginData, otp: otp };
}

async function verifySignupChallenge(challengeId, otp) {
  const { challenge, table } = await getChallengeById(challengeId);

  if (!challenge || !table) {
    throw new Error("CHALLENGE_INVALID");
  }

  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    throw new Error("OTP_EXPIRED");
  }

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    throw new Error("OTP_TOO_MANY_ATTEMPTS");
  }

  const submittedHash = Buffer.from(hashOtp(otp), "hex");
  const expectedHash = Buffer.from(challenge.otp_hash, "hex");
  const isMatch =
    submittedHash.length === expectedHash.length &&
    crypto.timingSafeEqual(submittedHash, expectedHash);

  if (!isMatch) {
    const nextAttempts = challenge.attempts + 1;

    await supabase
      .from(table)
      .update({ attempts: nextAttempts })
      .eq("id", challenge.id)
      .is("used_at", null);

    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
      throw new Error("OTP_TOO_MANY_ATTEMPTS");
    }

    throw new Error("OTP_INVALID");
  }

  const { error: usedError } = await supabase
    .from(table)
    .update({ used_at: new Date().toISOString() })
    .eq("id", challenge.id)
    .is("used_at", null);

  if (usedError) {
    console.error("Mark signup challenge used error:", usedError.message);
    throw usedError;
  }

  return { challenge: challenge };
}

async function resendSignupChallenge(challengeId) {
  const { challenge, table } = await getChallengeById(challengeId);

  if (!challenge || !table) {
    throw new Error("CHALLENGE_INVALID");
  }

  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    throw new Error("CHALLENGE_INVALID");
  }

  const sentTimestamp = new Date(challenge.sent_at || challenge.created_at).getTime();

  if (Date.now() - sentTimestamp < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    throw new Error("OTP_COOLDOWN");
  }

  const otp = createOtp();
  const updatePayload = {
    otp_hash: hashOtp(otp),
    attempts: 0,
  };

  if (table === "signup_email_challenges") {
    updatePayload.created_at = new Date().toISOString();
  } else {
    updatePayload.sent_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from(table)
    .update(updatePayload)
    .eq("id", challenge.id)
    .is("used_at", null);

  if (error) {
    throw error;
  }

  return {
    email: challenge.email,
    userId: challenge.user_id,
    otp: otp,
  };
}

module.exports = {
  createSignupChallenge,
  verifySignupChallenge,
  resendSignupChallenge,
  hashOtp,
};