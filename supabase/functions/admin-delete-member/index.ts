import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

async function collectFiles(
  client: ReturnType<typeof createClient>,
  bucket: string,
  folder: string,
  depth = 0,
): Promise<string[]> {
  if (depth > 5) throw new Error("Storage folder nesting exceeded the safe cleanup limit.");
  const files: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await client.storage.from(bucket).list(folder, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Could not list private ${bucket} files: ${error.message}`);
    const entries = data ?? [];
    for (const entry of entries) {
      const path = folder ? `${folder}/${entry.name}` : entry.name;
      if (entry.id == null) {
        files.push(...await collectFiles(client, bucket, path, depth + 1));
      } else {
        files.push(path);
      }
    }
    if (entries.length < 1000) break;
    offset += entries.length;
  }
  return files;
}

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
      return json({ error: "Secure account deletion is not configured on the server." }, 500);
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
    const callerId = callerResult.user.id;
    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles").select("role").eq("id", callerId).maybeSingle();
    if (callerProfileError) return json({ error: "Administrator access could not be verified." }, 500);
    if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) {
      return json({ error: "Only authorized administrators can delete members." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const targetId = String(body?.target_user_id ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
      return json({ error: "A valid member ID is required." }, 400);
    }
    if (targetId === callerId) return json({ error: "You cannot delete your own administrator account." }, 400);

    const { data: target, error: targetError } = await adminClient
      .from("profiles").select("id,full_name,role").eq("id", targetId).maybeSingle();
    if (targetError) return json({ error: "The member record could not be checked." }, 500);
    if (!target) return json({ error: "This member no longer exists." }, 404);
    if (["admin", "super_admin"].includes(target.role)) {
      return json({ error: "Administrator accounts are protected and cannot be deleted from Member Management." }, 403);
    }

    const { data: auditRow, error: auditError } = await adminClient
      .from("admin_audit_logs")
      .insert({
        admin_user_id: callerId,
        action: "member_permanent_delete",
        target_type: "profile",
        target_id: targetId,
        details: { stage: "requested", member_name_present: Boolean(target.full_name) },
      })
      .select("id").single();
    if (auditError) return json({ error: "Deletion was stopped because the audit record could not be written." }, 500);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetId);
    if (deleteError) {
      await adminClient.from("admin_audit_logs").update({
        details: { stage: "failed", reason: deleteError.message },
      }).eq("id", auditRow.id);
      return json({ error: "The account was not deleted: " + deleteError.message }, 500);
    }

    const cleanup: Record<string, string> = {};
    for (const bucket of ["resumes", "verification-demo"]) {
      try {
        const paths = await collectFiles(adminClient, bucket, targetId);
        for (let offset = 0; offset < paths.length; offset += 100) {
          const { error } = await adminClient.storage.from(bucket).remove(paths.slice(offset, offset + 100));
          if (error) throw new Error(error.message);
        }
        cleanup[bucket] = "complete";
      } catch (e) {
        cleanup[bucket] = "pending";
      }
    }
    const cleanupComplete = Object.values(cleanup).every(status => status === "complete");
    await adminClient.from("admin_audit_logs").update({
      details: { stage: "deleted", storage_cleanup: cleanup },
    }).eq("id", auditRow.id);

    return json({
      deleted: true,
      storage_cleanup_complete: cleanupComplete,
      warning: cleanupComplete ? null : "The account was deleted, but some private files need cleanup. They remain in private storage and are not publicly accessible.",
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "The member could not be deleted." }, 500);
  }
});
