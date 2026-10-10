import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), anonKey = Deno.env.get("SUPABASE_ANON_KEY"), resendKey = Deno.env.get("RESEND_API_KEY"), fromAddress = Deno.env.get("RESEND_SUPPORT_FROM");
  if (!url || !serviceKey || !anonKey) return json({ error: "Server authentication is not configured." }, 503);
  const bearer = req.headers.get("Authorization") || "";
  if (!bearer.startsWith("Bearer ")) return json({ error: "Sign-in required." }, 401);
  const authClient = createClient(url, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: bearer } } });
  const { data: userData, error: authError } = await authClient.auth.getUser();
  if (authError || !userData.user) return json({ error: "Sign-in required." }, 401);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: profile } = await db.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  if (!["admin", "super_admin"].includes(String(profile?.role || ""))) return json({ error: "Admin access required." }, 403);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const action = body.action;
  if (action === "list") {
    const { data: threads, error } = await db.from("support_email_threads").select("*").order("last_message_at", { ascending: false }).limit(100);
    if (error) return json({ error: "Could not load the email inbox." }, 500);
    return json({ threads: threads || [] });
  }
  if (action === "messages") {
    if (!body.thread_id) return json({ error: "Thread ID required." }, 400);
    const { data, error } = await db.from("support_email_messages").select("*,support_email_attachments(*)").eq("thread_id", body.thread_id).order("received_at", { ascending: true });
    if (error) return json({ error: "Could not load this email conversation." }, 500);
    await db.from("support_email_messages").update({ is_read: true }).eq("thread_id", body.thread_id).eq("direction", "inbound");
    await db.from("support_email_threads").update({ unread_count: 0 }).eq("id", body.thread_id);
    return json({ messages: data || [] });
  }
  if (action === "reply") {
    if (!resendKey || !fromAddress) return json({ error: "Set RESEND_API_KEY and RESEND_SUPPORT_FROM in Supabase Edge Function secrets before replying." }, 503);
    const threadId = String(body.thread_id || ""), textBody = String(body.body || "").trim();
    if (!threadId || !textBody) return json({ error: "Thread and reply text are required." }, 400);
    const { data: thread } = await db.from("support_email_threads").select("*").eq("id", threadId).maybeSingle();
    if (!thread) return json({ error: "Email conversation not found." }, 404);
    const { data: latest } = await db.from("support_email_messages").select("*").eq("thread_id", threadId).order("received_at", { ascending: false }).limit(1).maybeSingle();
    if (!latest) return json({ error: "No message found in this conversation." }, 404);
    const subject = thread.subject.toLowerCase().startsWith("re:") ? thread.subject : "Re: " + thread.subject;
    const headers: Record<string,string> = {};
    if (latest.message_id_header) headers["In-Reply-To"] = latest.message_id_header;
    const refs = [latest.references_header, latest.message_id_header].filter(Boolean).join(" ");
    if (refs) headers["References"] = refs;
    const sent = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + resendKey, "Content-Type": "application/json" }, body: JSON.stringify({ from: fromAddress, to: [thread.participant_email], subject, text: textBody, headers }) });
    const sentData: any = await sent.json().catch(() => ({}));
    if (!sent.ok) return json({ error: sentData.message || "Resend could not send this reply." }, 502);
    const now = new Date().toISOString();
    const { error: insertError } = await db.from("support_email_messages").insert({ thread_id: threadId, direction: "outbound", from_email: fromAddress, to_emails: [thread.participant_email], subject, text_body: textBody, received_at: now, is_read: true, resend_email_id: sentData.id || null, in_reply_to: latest.message_id_header, references_header: refs || null });
    if (insertError) return json({ error: "Reply was sent but could not be saved to the inbox." }, 500);
    await db.from("support_email_threads").update({ last_message_at: now, updated_at: now, status: "waiting" }).eq("id", threadId);
    return json({ sent: true });
  }
  if (action === "status") {
    if (!body.thread_id || !["open","waiting","closed"].includes(body.status)) return json({ error: "Valid thread and status are required." }, 400);
    const { error } = await db.from("support_email_threads").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", body.thread_id);
    if (error) return json({ error: "Could not update conversation status." }, 500);
    return json({ updated: true });
  }
  return json({ error: "Unknown action." }, 400);
});