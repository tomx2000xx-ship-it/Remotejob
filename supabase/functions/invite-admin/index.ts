import { withSupabase } from "npm:@supabase/server@1";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{...cors,"Content-Type":"application/json"}});
function brandedFrom(value: string): string {
  const match = value.match(/<([^<>]+)>/);
  const address = (match?.[1] ?? value).trim();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address) ? `RemoteWay <${address}>` : value;
}
const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
export default { fetch: withSupabase({auth:"user"}, async (req,ctx)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return json({error:"Method not allowed."},405);
 const uid=ctx.userClaims?.id||ctx.jwtClaims?.sub;
 if(!uid) return json({error:"Authentication required. Please sign in again."},401);
 const {data:caller,error:ce}=await ctx.supabaseAdmin.from("profiles").select("role").eq("id",uid).maybeSingle();
 if(ce) return json({error:"Could not verify administrator permissions: "+ce.message},500);
 if(caller?.role!=="super_admin") return json({error:"Only the super administrator can manage administrators."},403);
 let body:any;
 try { body=await req.json(); } catch { return json({error:"Request body must be valid JSON."},400); }
 const email=String(body.email||"").trim().toLowerCase();
 const fullName=String(body.full_name||"").trim();
 const password=String(body.password||"");
 if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"Enter a valid email address."},400);
 if(fullName.length<2) return json({error:"Enter the administrator's full name."},400);
 if(body.action==="send_invitation"){
   const {data:invite,error:inviteError}=await ctx.supabaseAdmin.from("admin_invites").select("id,role,status,invited_user_id").eq("email",email).maybeSingle();
   if(inviteError) return json({error:"Could not verify the administrator record: "+inviteError.message},500);
   if(!invite||invite.role!=="admin"||!invite.invited_user_id) return json({error:"Create the administrator account before sending an invitation."},400);
   const {data:userData,error:userError}=await ctx.supabaseAdmin.auth.admin.getUserById(invite.invited_user_id);
   if(userError||!userData?.user) return json({error:"Could not verify the administrator account."},400);
   const existingUser=invite.status==="accepted";
   if(!existingUser&&password.length<10) return json({error:"The temporary password is missing. Please recreate the invitation flow and try again."},400);
   const adminLink="https://remoteway.work/rpx-7m4q2";
   const siteUrl="https://remoteway.work";
   const passwordHtml=existingUser
     ? "<p><strong>Password:</strong> Use the password you already use for your RemoteWay account.</p>"
     : "<p><strong>Temporary password:</strong> "+esc(password)+"</p><p>For your security, sign in and change this temporary password as soon as practical.</p>";
   const html="<div style='font-family:Arial,sans-serif;color:#17231e;max-width:620px;margin:auto;line-height:1.6'><div style='background:#173d32;color:#fff;padding:24px 28px;border-radius:14px 14px 0 0'><h1 style='margin:0;font-size:24px'>Welcome to RemoteWay Admin</h1><p style='margin:6px 0 0;color:#e2eee7'>Work. Anywhere.</p></div><div style='padding:26px;border:1px solid #e1e8e3;border-top:0;border-radius:0 0 14px 14px'><p>Hello "+esc(fullName)+",</p><p>You have been added as an administrator on RemoteWay. Use the private administrator sign-in page below to access your dashboard.</p><p><strong>Full name:</strong> "+esc(fullName)+"<br><strong>Login email:</strong> "+esc(email)+"<br><strong>Role:</strong> Administrator</p>"+passwordHtml+"<p style='margin:28px 0'><a href='"+adminLink+"' style='display:inline-block;background:#1b5a46;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:bold'>Open Admin Sign-In</a></p><p>If the button does not open, copy this link into your browser:<br><a href='"+adminLink+"'>"+adminLink+"</a></p><p>Website: <a href='"+siteUrl+"'>"+siteUrl+"</a></p><p>The private link does not bypass sign-in or administrator permission checks. Keep your credentials private.</p><p>Welcome to the team,<br><strong>RemoteWay Team</strong></p></div></div>";
   const apiKey=Deno.env.get("RESEND_API_KEY");
   const from=Deno.env.get("EMAIL_FROM");
   if(!apiKey||!from) return json({error:"Email service is not configured (RESEND_API_KEY or EMAIL_FROM is missing)."},500);
   const resp=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({from:brandedFrom(from),to:[email],subject:"Your RemoteWay Administrator Access",html})});
   const result=await resp.json().catch(()=>({}));
   if(!resp.ok) return json({error:"Email provider rejected the invitation: "+String(result?.message||result?.name||"unknown email error")},502);
   await ctx.supabaseAdmin.from("admin_audit_logs").insert({admin_user_id:uid,action:"admin_invitation_sent",target_type:"profile",target_id:invite.invited_user_id,details:{email,full_name:fullName,email_id:result?.id||null}});
   return json({ok:true,email_sent:true,email_id:result?.id||null});
 }
 const {data:ud,error:ue}=await ctx.supabaseAdmin.auth.admin.listUsers({page:1,perPage:1000});
 if(ue) return json({error:"Could not check existing accounts: "+ue.message},400);
 const existing=ud.users.find(u=>(u.email||"").toLowerCase()===email);
 let userId=existing?.id;
 if(!userId){
   if(password.length<10) return json({error:"For a new administrator, enter a temporary password with at least 10 characters."},400);
   const {data,error}=await ctx.supabaseAdmin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:fullName}});
   if(error) return json({error:"Could not create the administrator account: "+error.message},400);
   userId=data.user?.id;
 }
 if(!userId) return json({error:"The administrator account could not be created."},500);
 const {error:pe}=await ctx.supabaseAdmin.from("profiles").upsert({id:userId,full_name:fullName,role:"admin",account_type:"job_seeker",account_status:"active",updated_at:new Date().toISOString()},{onConflict:"id"});
 if(pe) return json({error:"The account exists, but its administrator profile could not be saved: "+pe.message},500);
 const {error:ie}=await ctx.supabaseAdmin.from("admin_invites").upsert({email,full_name:fullName,role:"admin",status:existing?"accepted":"pending",invited_by:uid,invited_user_id:userId},{onConflict:"email"});
 if(ie) return json({error:"Administrator account created, but invitation tracking failed: "+ie.message},500);
 const {error:ae}=await ctx.supabaseAdmin.from("admin_audit_logs").insert({admin_user_id:uid,action:existing?"admin_promoted":"admin_created",target_type:"profile",target_id:userId,details:{email,full_name:fullName,existing_user:Boolean(existing)}});
 if(ae) return json({error:"Administrator account created, but audit logging failed: "+ae.message},500);
 return json({ok:true,user_id:userId,existing_user:Boolean(existing)});
})};