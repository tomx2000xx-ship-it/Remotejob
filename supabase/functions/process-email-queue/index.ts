import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-cron-secret"};
function brandedFrom(value: string): string {
  const match = value.match(/<([^<>]+)>/);
  const address = (match?.[1] ?? value).trim();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address) ? `RemoteWay <${address}>` : value;
}
function escapeHtml(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch] as string)); }
function resolveSiteUrl(value: string | undefined): string {
  const fallback = "https://remoteway.work";
  if (!value) return fallback;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.hostname !== "remoteway.work") return fallback;
    return parsed.origin;
  } catch {
    return fallback;
  }
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  const resendKey=Deno.env.get("RESEND_API_KEY"), emailFrom=Deno.env.get("EMAIL_FROM");
  const siteUrl=resolveSiteUrl(Deno.env.get("SITE_URL"));
  if(!resendKey||!emailFrom) return new Response(JSON.stringify({processed:0,skipped:true,message:"Configure RESEND_API_KEY and EMAIL_FROM to enable email delivery."}),{status:200,headers:{...corsHeaders,"Content-Type":"application/json"}});
  const supabaseUrl=Deno.env.get("SUPABASE_URL"), serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!supabaseUrl||!serviceKey) return new Response(JSON.stringify({error:"Supabase service configuration is missing."}),{status:500,headers:{...corsHeaders,"Content-Type":"application/json"}});
  const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const providedSecret=req.headers.get("x-cron-secret") ?? "";
  const {data:authorized,error:authError}=await admin.rpc("verify_email_cron_secret",{p_candidate:providedSecret});
  if(authError||authorized!==true) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{...corsHeaders,"Content-Type":"application/json"}});
  const {data:items,error:claimError}=await admin.rpc("claim_due_email_queue",{p_limit:1});
  if(claimError) return new Response(JSON.stringify({error:claimError.message}),{status:500,headers:{...corsHeaders,"Content-Type":"application/json"}});
  let sent=0,failed=0;
  for(const item of (Array.isArray(items)?items:[])){
    const table=item.queue_table==="interview_email_queue"?"interview_email_queue":item.queue_table==="admin_email_queue"?"admin_email_queue":null;
    if(!table) continue;
    const route=String(item.route_path||"/dashboard");
    const link=siteUrl+(route.startsWith("/")?route:"/"+route);
    const body=escapeHtml(item.body).replace(/\n/g,"<br/>").replace(/(https:\/\/[^\s<]+)/g, '<a href="$1" style="color:#2f6b52;text-decoration:underline">$1</a>');
    const html=`<!doctype html><html><body style="margin:0;background:#f6f5ef;font-family:Arial,sans-serif;color:#26382f"><div style="max-width:620px;margin:24px auto;padding:28px;background:#fff;border:1px solid #e5e9e2;border-radius:16px"><p style="font-size:12px;letter-spacing:2px;color:#4e765d;font-weight:bold">REMOTEWAY</p><h1 style="font-size:24px;line-height:1.25">${escapeHtml(item.subject)}</h1><p style="font-size:15px;line-height:1.75;color:#526258">${body}</p><p style="margin:26px 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#2f6b52;color:#fff;text-decoration:none;padding:13px 19px;border-radius:9px;font-weight:bold">Open RemoteWay</a></p><p style="font-size:12px;line-height:1.6;color:#849087">If the button does not open, copy this link into your browser: <a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p><hr style="border:0;border-top:1px solid #e8ece6;margin:24px 0"/><p style="font-size:11px;color:#89948d">RemoteWay · Opportunities that work for you.</p></div></body></html>`;
    try{
      const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+resendKey,"Content-Type":"application/json"},body:JSON.stringify({from:brandedFrom(emailFrom),to:[item.recipient_email],subject:item.subject,html})});
      const responseText=await response.text();
      if(!response.ok) throw new Error("Resend "+response.status+": "+responseText.slice(0,500));
      const {error:updateError}=await admin.from(table).update({status:"sent",sent_at:new Date().toISOString(),error_message:null}).eq("id",item.id);
      if(updateError) throw updateError;
      if(table==="interview_email_queue"&&item.interview_id) await admin.from("interviews").update({status:"scheduled"}).eq("id",item.interview_id).eq("status","invitation_pending");
      sent++;
    }catch(error){await admin.from(table).update({status:"failed",error_message:String(error).slice(0,1000)}).eq("id",item.id);failed++;}
  }
  return new Response(JSON.stringify({processed:sent+failed,sent,failed}),{status:200,headers:{...corsHeaders,"Content-Type":"application/json"}});
});