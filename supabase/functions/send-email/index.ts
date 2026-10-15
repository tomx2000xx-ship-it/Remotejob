import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

type AuthEvent = {
  user: { id?: string; email?: string; new_email?: string; user_metadata?: Record<string, unknown> };
  email_data: {
    token?: string;
    token_hash?: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to?: string;
    site_url?: string;
    email_action_type: string;
  };
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "RemoteWay <support@remoteway.work>";
const HOOK_SECRET = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "").replace(/^v1,whsec_/, "");
const SITE_URL = "https://remoteway.work";

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[ch] as string));

function renderTextBody(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/(https:\/\/[^\s&lt;]+)/g, '<a href="$1" style="color:#2f6b52;text-decoration:underline;overflow-wrap:anywhere">$1</a>')
    .replace(/\n/g, "<br>");
}

function resolveActionUrl(tokenHash: string, actionType: string, redirectTo?: string, siteUrl?: string): string {
  if (!tokenHash) throw new Error("Supabase did not provide a token hash for this email action.");
  const allowedRedirect = redirectTo || siteUrl || SITE_URL;
  const url = new URL("/auth/v1/verify", SUPABASE_URL);
  url.searchParams.set("token", tokenHash);
  url.searchParams.set("type", actionType);
  url.searchParams.set("redirect_to", allowedRedirect);
  return url.toString();
}

function actionTypeForVerify(action: string): string {
  switch (action) {
    case "signup": return "signup";
    case "invite": return "invite";
    case "magiclink": return "magiclink";
    case "recovery": return "recovery";
    case "email_change": return "email_change";
    case "reauthentication": return "email";
    default: throw new Error("Unsupported Supabase email action: " + action);
  }
}

function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  );
}

async function getStudioTemplates(): Promise<Array<{ id: string; name?: string; subject?: string; body?: string; category?: string }>> {
  if (!supabaseAdmin) throw new Error("Supabase service configuration is missing.");
  const { data, error } = await supabaseAdmin.from("site_settings").select("value").eq("key", "email_templates").maybeSingle();
  if (error) throw new Error("Could not load the Email Studio templates: " + error.message);
  if (!Array.isArray(data?.value)) throw new Error("The saved Email Studio templates are unavailable.");
  return data.value;
}

function selectTemplate(templates: Array<{ id: string; name?: string; subject?: string; body?: string }>, action: string) {
  const id = action === "signup" ? "verification" : action === "recovery" ? "reset" : null;
  if (id) {
    const found = templates.find(template => template.id === id);
    if (found) return found;
  }
  const fallback = templates.find(template => template.id === "verification");
  if (fallback) return {
    ...fallback,
    subject: action === "magiclink" ? "Your RemoteWay sign-in link"
      : action === "invite" ? "Your invitation to RemoteWay"
      : action === "email_change" ? "Confirm your new RemoteWay email"
      : action === "reauthentication" ? "Verify your RemoteWay identity"
      : fallback.subject,
    body: String(fallback.body ?? "").replace(/confirm your email address/i, "complete this secure account action"),
  };
  throw new Error("No usable Email Studio template was found.");
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: EMAIL_FROM.includes("<") ? EMAIL_FROM : `RemoteWay <${EMAIL_FROM}>`,
      to: [to],
      subject,
      text: body,
      html: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:24px 12px;background:#f7f4ec;font-family:Arial,Helvetica,sans-serif;color:#303844"><div style="box-sizing:border-box;max-width:860px;margin:0 auto;padding:28px 30px;background:#fff;border:1px solid #e4e7e3;border-radius:16px"><div style="font-size:20px;line-height:1.4;font-weight:800;color:#1d5d4d;padding-bottom:12px;border-bottom:2px solid #1d5d4d">↗ RemoteWay</div><h1 style="font-size:24px;line-height:1.35;font-weight:750;margin:18px 0 10px;color:#303844">${escapeHtml(subject)}</h1><div style="font-size:16px;line-height:1.75;color:#414854;overflow-wrap:anywhere">${renderTextBody(body)}</div><div style="border-top:1px solid #e4e7e3;margin-top:22px;padding-top:12px;font-size:12px;line-height:1.5;color:#6c7773">RemoteWay · Work. Anywhere.</div></div></body></html>`,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Resend rejected the authentication email (" + response.status + "): " + String(result?.message ?? "unknown error"));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!HOOK_SECRET || !RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Send Email Hook is missing one or more required function secrets.");
    return Response.json({ error: "Send Email Hook is not configured." }, { status: 500 });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    const verified = new Webhook(HOOK_SECRET).verify(payload, headers) as AuthEvent;
    const { user, email_data: emailData } = verified;
    if (!emailData?.email_action_type) throw new Error("Missing email action type.");

    const action = emailData.email_action_type;
    const templates = await getStudioTemplates();
    const template = selectTemplate(templates, action);
    const firstName = String(user.user_metadata?.first_name ?? user.user_metadata?.full_name ?? "").trim().split(/\s+/)[0] || "there";
    const tokenHash = emailData.token_hash ?? "";
    const actionUrl = resolveActionUrl(tokenHash, actionTypeForVerify(action), emailData.redirect_to, emailData.site_url);
    const subject = interpolate(String(template.subject ?? "RemoteWay account security"), {
      first_name: firstName,
      email: String(user.email ?? ""),
    });
    const body = interpolate(String(template.body ?? ""), {
      first_name: firstName,
      email: String(user.email ?? ""),
      ConfirmationURL: actionUrl,
      RecoveryURL: actionUrl,
      ".ConfirmationURL": actionUrl,
      ".RecoveryURL": actionUrl,
      token: String(emailData.token ?? ""),
    });

    if (action === "email_change" && emailData.token_hash_new && emailData.token_new && user.email && user.new_email) {
      const currentUrl = resolveActionUrl(emailData.token_hash_new, "email_change", emailData.redirect_to, emailData.site_url);
      const newUrl = resolveActionUrl(emailData.token_hash, "email_change", emailData.redirect_to, emailData.site_url);
      const currentBody = interpolate(String(template.body ?? ""), { first_name: firstName, ConfirmationURL: currentUrl, RecoveryURL: currentUrl, ".ConfirmationURL": currentUrl, ".RecoveryURL": currentUrl, token: String(emailData.token ?? "") });
      const newBody = interpolate(String(template.body ?? ""), { first_name: firstName, ConfirmationURL: newUrl, RecoveryURL: newUrl, ".ConfirmationURL": newUrl, ".RecoveryURL": newUrl, token: String(emailData.token_new ?? "") });
      await sendEmail(user.email, subject, currentBody);
      await sendEmail(user.new_email, subject, newBody);
    } else {
      const recipient = action === "email_change" ? (user.new_email || user.email) : user.email;
      if (!recipient) throw new Error("Supabase did not provide a recipient email address.");
      await sendEmail(recipient, subject, body);
    }

    return Response.json({});
  } catch (error) {
    console.error("Send Email Hook failed:", error instanceof Error ? error.message : String(error));
    return Response.json({ error: { http_code: 500, message: "Authentication email could not be sent." } }, { status: 500 });
  }
});
