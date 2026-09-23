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

function getChallengeById(challengeId) {
  return supabase
    .from("login_email_challenges")
    .select("*")
    .eq("id", challengeId)
    .is("used_at", null)
    .maybeSingle();
}

async function createLoginChallenge(user, session) {
  if (!user?.id || !user?.email) {
    throw new Error("AUTH_USER_REQUIRED");
  }

  if (
    !session?.access_token ||
    !session?.refresh_token
  ) {
    throw new Error("AUTH_SESSION_REQUIRED");
  }

  const otp = createOtp();

  const { data, error } = await supabase
    .from("login_email_challenges")
    .insert({
      user_id: user.id,
      email: user.email.toLowerCase(),
      otp_hash: hashOtp(otp),
      session_ciphertext: encryptSession(session),
      expires_at: new Date(
        Date.now() +
          OTP_EXPIRY_MINUTES * 60 * 1000
      ).toISOString(),
      sent_at: new Date().toISOString(),
      attempts: 0,
      used_at: null,
    })
    .select("id,email,expires_at,sent_at")
    .single();

  if (error) {
    console.error(
      "Create login challenge error:",
      error.message
    );
    throw error;
  }

  return {
    challenge: data,
    otp,
  };
}

async function verifyLoginChallenge(challengeId, otp) {
  const result = await getChallengeById(challengeId);

  if (result.error) {
    console.error(
      "Find login challenge error:",
      result.error.message
    );
    throw result.error;
  }

  const challenge = result.data;

  if (!challenge) {
    throw new Error("CHALLENGE_INVALID");
  }

  if (
    new Date(challenge.expires_at).getTime() <=
    Date.now()
  ) {
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

    const { error } = await supabase
      .from("login_email_challenges")
      .update({
        attempts: nextAttempts,
      })
      .eq("id", challenge.id)
      .is("used_at", null);

    if (error) {
      console.error(
        "Update OTP attempts error:",
        error.message
      );
    }

    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
      throw new Error("OTP_TOO_MANY_ATTEMPTS");
    }

    throw new Error("OTP_INVALID");
  }

  const session = decryptSession(
    challenge.session_ciphertext
  );

  const { error: usedError } = await supabase
    .from("login_email_challenges")
    .update({
      used_at: new Date().toISOString(),
    })
    .eq("id", challenge.id)
    .is("used_at", null);

  if (usedError) {
    console.error(
      "Mark login challenge used error:",
      usedError.message
    );
    throw usedError;
  }

  return {
    challenge,
    session,
  };
}

async function resendLoginChallenge(challengeId) {
  const result = await getChallengeById(challengeId);

  if (result.error) {
    throw result.error;
  }

  const challenge = result.data;

  if (!challenge) {
    throw new Error("CHALLENGE_INVALID");
  }

  if (
    new Date(challenge.expires_at).getTime() <=
    Date.now()
  ) {
    throw new Error("CHALLENGE_INVALID");
  }

  const sentAt = new Date(challenge.sent_at).getTime();

  if (
    Date.now() - sentAt <
    OTP_RESEND_COOLDOWN_SECONDS * 1000
  ) {
    throw new Error("OTP_COOLDOWN");
  }

  const otp = createOtp();

  const { error } = await supabase
    .from("login_email_challenges")
    .update({
      otp_hash: hashOtp(otp),
      sent_at: new Date().toISOString(),
      attempts: 0,
    })
    .eq("id", challenge.id)
    .is("used_at", null);

  if (error) {
    throw error;
  }

  return {
    email: challenge.email,
    otp,
  };
}

async function cleanupExpiredChallenges() {
  const { error } = await supabase
    .from("login_email_challenges")
    .delete()
    .lt(
      "expires_at",
      new Date().toISOString()
    );

  if (error) {
    console.error(
      "Challenge cleanup error:",
      error.message
    );
  }
}

module.exports = {
  createLoginChallenge,
  verifyLoginChallenge,
  resendLoginChallenge,
  cleanupExpiredChallenges,
  decryptSession,
};