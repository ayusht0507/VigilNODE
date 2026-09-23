const { createServerClient } = require("@supabase/ssr");

function createSupabaseServerClient(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is missing from .env");
  }

  if (!supabasePublishableKey) {
    throw new Error(
      "SUPABASE_PUBLISHABLE_KEY is missing from .env"
    );
  }

  return createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return Object.entries(req.cookies || {}).map(
            ([name, value]) => ({
              name,
              value,
            })
          );
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              res.cookie(name, value, options);
            }
          );
        },
      },
    }
  );
}

module.exports = {
  createSupabaseServerClient,
};