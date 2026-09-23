const supabase = require("./supabase");

async function upsertProfile(user) {
  if (!user?.id) {
    throw new Error("AUTH_USER_ID_REQUIRED");
  }

  const profile = {
    id: user.id,
    name: user.name || user.user_metadata?.name || "",
    email: user.email || null,
    email_verified: Boolean(
      user.email_confirmed_at ||
      user.email_verified_at ||
      user.email_verified
    ),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, {
      onConflict: "id",
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase profile error:", error.message);
    throw error;
  }

  return data;
}

async function recordAuthEvent(user, eventType) {
  if (!user?.id) {
    throw new Error("AUTH_USER_ID_REQUIRED");
  }

  if (!["login", "logout"].includes(eventType)) {
    throw new Error("INVALID_AUTH_EVENT");
  }

  const profile = await upsertProfile(user);

  const { error } = await supabase
    .from("auth_events")
    .insert({
      profile_id: profile.id,
      event_type: eventType,
    });

  if (error) {
    console.error("Supabase auth event error:", error.message);
    throw error;
  }

  return true;
}

module.exports = {
  upsertProfile,
  recordAuthEvent,
};