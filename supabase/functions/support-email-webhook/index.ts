import { Webhook } from "npm:svix@1.76.1";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, svix-id, svix-timestamp, svix-signature", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
const address = (raw: unknown) => {
  const s = String(raw ?? "");
  const m = s.match(/^(.*?)\s*<([^<>]+)>$/);
  return { email: (m ? m[2] : s).trim().toLowerCase(), name: (m?.[1] || "").replace(/^["']|["']$/g, "").trim() || null };
};
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !resendKey || !url || !serviceKey) return json({ error: "Email receiving is not configured on the server." }, 503);
  const raw = await req.text();
  try {
    const verifier = new Webhook(secret);
    verifier.verify(raw, {
      "svix-id": req.headers.get("svix-id") || "",
      "svix-timestamp": req.headers.get("svix-timestamp") || "",
      "svix-signature": req.headers.get("svix-signature") || "",
    });
  } catch {
    return json({ error: "Invalid webhook signature." }, 401);
  }
  let event: any;
  try { event = JSON.parse(raw); } catch { return json({ error: "Invalid JSON." }, 400); }
  if (event.type !== "email.received") return json({ received: true, ignored: true });
  const emailId = event.data?.email_id;
  if (!emailId) return json({ error: "Missing received email ID." }, 400);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: existing } = await db.from("support_email_messages").select("id").eq("resend_email_id", emailId).maybeSingle();
  if (existing) return json({ received: true, duplicate: true });
  const response = await fetch("https://api.resend.com/emails/receiving/" + encodeURIComponent(emailId), { headers: { Authorization: "Bearer " + resendKey } });
  if (!response.ok) return json({ error: "Could not retrieve received email from Resend." }, 502);
  const email: any = await response.json();
  const from = address(email.from || event.data?.from);
  const to = Array.isArray(email.to) ? email.to : (Array.isArray(event.data?.to) ? event.data.to : [email.to || event.data?.to].filter(Boolean));
  const headers: any = email.headers || {};
  const header = (name: string) => {
    if (Array.isArray(headers)) return headers.find((h: any) => String(h.name || h.key || "").toLowerCase() === name.toLowerCase())?.value || null;
    const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
    return key ? headers[key] : null;
  };
  const inReplyTo = header("in-reply-to");
  const references = header("references");
  let thread: any = null;
  const candidates = [inReplyTo, ...(String(references || "").match(/<[^>]+>/g) || [])].filter(Boolean);
  for (const candidate of candidates) {
    const { data } = await db.from("support_email_messages").select("thread_id").eq("message_id_header", candidate).maybeSingle();
    if (data?.thread_id) { const got = await db.from("support_email_threads").select("*").eq("id", data.thread_id).maybeSingle(); thread = got.data; break; }
  }
  const subject = String(email.subject || event.data?.subject || "(no subject)");
  if (!thread) {
    const created = await db.from("support_email_threads").insert({ subject, participant_email: from.email || "unknown", participant_name: from.name, unread_count: 1, last_message_at: email.created_at || new Date().toISOString() }).select("*").single();
    if (created.error) return json({ error: "Could not create email thread." }, 500);
    thread = created.data;
  }
  const toList = Array.isArray(to) ? to : [to];
  const inserted = await db.from("support_email_messages").insert({
    thread_id: thread.id, direction: "inbound", from_email: from.email || "unknown", from_name: from.name,
    to_emails: toList, subject, text_body: String(email.text || String(email.html || "").replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/\s+/g, " ").trim()), html_body: typeof email.html === "string" ? email.html : null,
    received_at: email.created_at || new Date().toISOString(), is_read: false, resend_email_id: emailId,
    message_id_header: header("message-id"), in_reply_to: inReplyTo, references_header: references
  }).select("id").single();
  if (inserted.error) {
    if (String(inserted.error.code) === "23505") return json({ received: true, duplicate: true });
    return json({ error: "Could not store received email." }, 500);
  }
  const updated = await db.from("support_email_threads").update({ subject, unread_count: (thread.unread_count || 0) + 1, last_message_at: email.created_at || new Date().toISOString(), status: "open", updated_at: new Date().toISOString() }).eq("id", thread.id);
  if (updated.error) return json({ error: "Email stored but thread summary update failed." }, 500);
  const attachments = Array.isArray(email.attachments) ? email.attachments : [];
  if (attachments.length) {
    await db.from("support_email_attachments").insert(attachments.map((a: any) => ({ message_id: inserted.data.id, filename: String(a.filename || a.name || "attachment"), content_type: a.content_type || a.contentType || null, size_bytes: Number(a.size || a.size_bytes || 0) || null, storage_path: a.download_url || a.url || null, content_id: a.content_id || null })));
  }
  return json({ received: true });
});