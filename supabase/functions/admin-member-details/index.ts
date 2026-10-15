import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in as an administrator to continue." }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) {
      return json({ error: "Secure member account lookup is not configured on the server." }, 500);
    }

    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: callerResult, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerResult.user) return json({ error: "Your session is invalid or expired." }, 401);

    const adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles").select("role").eq("id", callerResult.user.id).maybeSingle();
    if (callerProfileError) return json({ error: "Administrator access could not be verified." }, 500);
    if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) {
      return json({ error: "Only authorized administrators can view member account details." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const targetId = String(body?.target_user_id ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
      return json({ error: "A valid member ID is required." }, 400);
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles").select("id,role,phone_number").eq("id", targetId).maybeSingle();
    if (targetProfileError) return json({ error: "The member profile could not be loaded." }, 500);
    if (!targetProfile || ["admin", "super_admin"].includes(targetProfile.role)) {
      return json({ error: "This member record is unavailable." }, 404);
    }

    const { data: authResult, error: authError } = await adminClient.auth.admin.getUserById(targetId);
    if (authError) return json({ error: "The member's registered email could not be loaded." }, 500);

    return json({
      account: {
        user_id: targetId,
        email: authResult.user?.email ?? null,
        phone_number: targetProfile.phone_number ?? null,
        email_confirmed_at: authResult.user?.email_confirmed_at ?? null,
        last_sign_in_at: authResult.user?.last_sign_in_at ?? null,
        created_at: authResult.user?.created_at ?? null,
        updated_at: authResult.user?.updated_at ?? null,
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Member account details could not be loaded." }, 500);
  }
});
