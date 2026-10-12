import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Administrator sign-in is required." }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("REMOTEWAY_FROM_EMAIL");
    if (!url || !anonKey || !serviceKey || !resendKey || !from) {
      return json({ error: "Verification email service is not configured. Set RESEND_API_KEY and REMOTEWAY_FROM_EMAIL in Supabase function secrets." }, 503);
    }
    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user) return json({ error: "Your administrator session is invalid or expired." }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: callerProfile, error: profileError } = await admin.from("profiles").select("role").eq("id", callerData.user.id).maybeSingle();
    if (profileError) return json({ error: "Administrator access could not be verified." }, 500);
    if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) return json({ error: "Only administrators can send verification status emails." }, 403);

    const body = await req.json().catch(() => ({}));
    const verificationId = Number(body?.verification_id);
    const status = String(body?.status ?? "");
    const reason = String(body?.reason ?? "").trim().slice(0, 1200);
    if (!Number.isSafeInteger(verificationId) || verificationId <= 0 || !["verified", "rejected"].includes(status)) {
      return json({ error: "A valid verification case and final status are required." }, 400);
    }
    const { data: verification, error: verificationError } = await admin.from("verification_profiles").select("id,user_id,status,verified_at,needs_attention_reason").eq("id", verificationId).maybeSingle();
    if (verificationError) return json({ error: "Verification status could not be confirmed." }, 500);
    if (!verification || verification.status !== status) return json({ error: "The saved verification status does not match this email request." }, 409);
    if (status === "verified" && !verification.verified_at) return json({ error: "Approval timestamp is missing; no email was sent." }, 409);
    const { data: member, error: memberError } = await admin.auth.admin.getUserById(verification.user_id);
    if (memberError || !member.user?.email) return json({ error: "The member email address could not be found." }, 404);

    const subject = status === "verified" ? "Your RemoteWay identity verification is approved" : "Action required: your RemoteWay identity verification was rejected";
    const headline = status === "verified" ? "Your identity is verified" : "Please verify your identity again";
    const explanation = status === "verified"
      ? "Your identity verification has been approved. You can continue to the next steps in your RemoteWay account. You must also add an active payout method before applying for jobs."
      : "We could not approve your identity verification. Please sign in to RemoteWay, review the issue below, and submit your identity details and document images again.";
    const issueBlock = status === "rejected" ? `<div style="padding:16px;border-radius:10px;background:#fff4e5;margin:20px 0"><strong>Reason provided by our review team</strong><p style="margin-bottom:0;white-space:pre-wrap">${reason.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;") || "The submitted details or document could not be verified."}</p></div>` : "";
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;line-height:1.6"><h1 style="font-size:24px">${headline}</h1><p>Hello ${String(member.user.user_metadata?.full_name || "there").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")},</p><p>${explanation}</p>${issueBlock}<p>Open your account at <a href="https://remoteway.work">remoteway.work</a> to continue.</p><p>Regards,<br/>RemoteWay Support</p></div>`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [member.user.email], subject, html, text: `${headline}\n\n${explanation}${status === "rejected" ? `\n\nReason: ${reason || "The submitted details or document could not be verified."}` : ""}\n\nVisit https://remoteway.work\nRemoteWay Support` }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return json({ error: result?.message || "The email provider rejected the message." }, 502);
    return json({ sent: true, status, email_id: result?.id ?? null });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "The verification email could not be sent." }, 500);
  }
});
