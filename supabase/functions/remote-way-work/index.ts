import { withSupabase } from "npm:@supabase/server@1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { ...cors, "Content-Type": "application/json" } });

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const parseDate = (s: string) => new Date(s + "T00:00:00.000Z");
const isWeekday = (d: Date) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5;
const wordsIn = (s: string) => (String(s || "").trim().match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
const normalize = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const keywordMatches = (text: string, keyword: string) => {
  const hay = " " + normalize(text) + " ";
  const needle = " " + normalize(keyword) + " ";
  return needle.trim().length > 0 && hay.includes(needle);
};
function workdayNumber(startDate: string, today: string) {
  const start = parseDate(startDate), end = parseDate(today);
  if (start > end) return 0;
  let count = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) if (isWeekday(d)) count++;
  return count;
}
function currentWeek(startDate: string, today: string) {
  const delta = Math.max(0, Math.floor((parseDate(today).getTime() - parseDate(startDate).getTime()) / 86400000));
  const start = parseDate(startDate);
  start.setUTCDate(start.getUTCDate() + Math.floor(delta / 7) * 7);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6);
  return { week_start: isoDate(start), week_end: isoDate(end) };
}
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
    const uid = ctx.userClaims?.id || ctx.jwtClaims?.sub;
    if (!uid) return json({ error: "Authentication required. Please sign in again." }, 401);
    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400); }
    const db = ctx.supabaseAdmin;
    const today = isoDate(new Date());

    if (body.action === "get_tasks") {
      const applicationId = Number(body.application_id);
      if (!Number.isSafeInteger(applicationId) || applicationId <= 0) return json({ error: "Choose a valid job workspace." }, 400);
      const [{ data: access, error: accessError }, { data: app, error: appError }] = await Promise.all([
        db.from("job_workspace_access").select("application_id,candidate_id,job_id,created_at,work_started_at").eq("application_id", applicationId).eq("candidate_id", uid).maybeSingle(),
        db.from("applications").select("id,job_id,status").eq("id", applicationId).eq("user_id", uid).maybeSingle(),
      ]);
      if (accessError || appError) return json({ error: (accessError || appError).message }, 500);
      if (!access || !app || app.status !== "hired" || Number(app.job_id) !== Number(access.job_id)) return json({ error: "This job workspace is not active for your account." }, 403);
      const { data: network, error: networkError } = await db.from("job_network_profiles").select("submitted_at").eq("application_id", applicationId).eq("candidate_id", uid).maybeSingle();
      if (networkError) return json({ error: networkError.message }, 500);
      if (!network) return json({ onboarding_required: true, tasks: [], message: "Submit your network and device information before opening work tasks." });
      const startAt = access.work_started_at || network.submitted_at || access.created_at;
      if (!access.work_started_at) {
        const { error: startError } = await db.from("job_workspace_access").update({ work_started_at: startAt }).eq("application_id", applicationId).eq("candidate_id", uid).is("work_started_at", null);
        if (startError) return json({ error: "Could not record your work start date: " + startError.message }, 500);
      }
      const startDate = String(startAt).slice(0, 10);
      const dayNumber = workdayNumber(startDate, today);
      const { data: templates, error: templateError } = await db.from("job_task_templates")
        .select("id,job_id,day_number,title,instructions,task_type,max_reward,estimated_minutes,is_simulated")
        .eq("job_id", access.job_id).eq("is_published", true).order("day_number", { ascending: true });
      if (templateError) return json({ error: templateError.message }, 500);
      const templateMap = new Map((templates || []).map((t: any) => [Number(t.day_number), t]));
      const pendingAssignments: any[] = [];
      let day = 0;
      const cursor = parseDate(startDate), end = parseDate(today);
      for (let d = new Date(cursor); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        if (!isWeekday(d)) continue;
        day++;
        if (day > 20) break;
        const t: any = templateMap.get(day);
        if (t) pendingAssignments.push({ application_id: applicationId, candidate_id: uid, job_id: access.job_id, task_template_id: t.id, assigned_date: isoDate(d), status: "available" });
      }
      if (pendingAssignments.length) {
        const { error: assignError } = await db.from("job_task_assignments").upsert(pendingAssignments, { onConflict: "application_id,task_template_id", ignoreDuplicates: true });
        if (assignError) return json({ error: "Could not prepare your daily tasks: " + assignError.message }, 500);
      }
      const { data: assignments, error: assignmentError } = await db.from("job_task_assignments")
        .select("id,application_id,task_template_id,assigned_date,status,created_at")
        .eq("application_id", applicationId).eq("candidate_id", uid).order("assigned_date", { ascending: true });
      if (assignmentError) return json({ error: assignmentError.message }, 500);
      const assignmentIds = (assignments || []).map((a: any) => a.id);
      const [{ data: submissions, error: submissionError }, { data: ledger, error: ledgerError }, { data: allAccess }, { data: payoutRows, error: payoutError }] = await Promise.all([
        assignmentIds.length ? db.from("job_task_submissions").select("id,assignment_id,response,completion_percent,quality_score,grade_band,feedback,reward_amount,status,submitted_at,graded_at").eq("candidate_id", uid).in("assignment_id", assignmentIds) : Promise.resolve({ data: [], error: null }),
        db.from("job_earnings_ledger").select("amount,status,week_start,week_end").eq("candidate_id", uid).neq("status", "reversed"),
        db.from("job_workspace_access").select("work_started_at,created_at").eq("candidate_id", uid),
        db.from("payouts").select("amount,status").eq("user_id", uid).in("status", ["pending","processing","paid"]),
      ]);
      if (submissionError || ledgerError || payoutError) return json({ error: (submissionError || ledgerError || payoutError).message }, 500);
      const subMap = new Map((submissions || []).map((s: any) => [Number(s.assignment_id), s]));
      const tMap = new Map((templates || []).map((t: any) => [Number(t.id), t]));
      const tasks = (assignments || []).map((a: any) => ({
        ...a, template: tMap.get(Number(a.task_template_id)) || null, submission: subMap.get(Number(a.id)) || null,
      })).filter((a: any) => a.template);
      const todaySubmissions = (submissions || []).filter((s: any) => s.graded_at && String(s.graded_at).slice(0, 10) === today);
      const todayEarnings = todaySubmissions.reduce((n: number, s: any) => n + Number(s.reward_amount || 0), 0);
      const todayScores = todaySubmissions.filter((s: any) => s.quality_score != null).map((s: any) => Number(s.quality_score));
      const earliest = (allAccess || []).map((a: any) => a.work_started_at || a.created_at).filter(Boolean).map((v: string) => v.slice(0, 10)).sort()[0] || startDate;
      const week = currentWeek(earliest, today);
      const weeklyEarned = (ledger || []).filter((r: any) => r.week_start === week.week_start && r.status !== "reversed").reduce((n: number, r: any) => n + Number(r.amount || 0), 0);
      const earnedAvailable = (ledger || []).filter((r: any) => r.status === "approved" && r.week_end < today).reduce((n: number, r: any) => n + Number(r.amount || 0), 0);
      const reservedPayouts = (payoutRows || []).reduce((n: number, r: any) => n + Number(r.amount || 0), 0);
      const availableBalance = Math.max(0, earnedAvailable - reservedPayouts);
      return json({
        onboarding_required: false, start_date: startDate, workday_number: dayNumber, total_workdays: 20,
        is_workday: isWeekday(parseDate(today)), today,
        tasks, weekly_earned: Math.min(200, weeklyEarned), available_balance: Number(availableBalance.toFixed(2)), weekly_cap: 200,
        daily_summary: { completed: todaySubmissions.length, score: todayScores.length ? Math.round(todayScores.reduce((a: number,b: number)=>a+b,0)/todayScores.length) : null, earnings: Number(todayEarnings.toFixed(2)) },
        message: !isWeekday(parseDate(today)) ? "The work schedule is Monday to Friday. You can review past submissions today; new tasks resume on the next weekday." : dayNumber > 20 ? "You have reached the end of the 20-weekday practice programme." : "Your weekday tasks are ready.",
      });
    }

    if (body.action === "submit_task") {
      const assignmentId = Number(body.assignment_id);
      const responseText = String(body.response || "").trim();
      if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) return json({ error: "Choose a valid task." }, 400);
      if (wordsIn(responseText) < 8) return json({ error: "Please write at least 8 words so the task can be assessed." }, 400);
      if (responseText.length > 10000) return json({ error: "Please keep your response under 10,000 characters." }, 400);
      const { data: assignment, error: assignmentError } = await db.from("job_task_assignments")
        .select("id,candidate_id,application_id,task_template_id,assigned_date,status")
        .eq("id", assignmentId).eq("candidate_id", uid).maybeSingle();
      if (assignmentError) return json({ error: assignmentError.message }, 500);
      if (!assignment || assignment.status !== "available" || assignment.assigned_date > today) return json({ error: "This task is already submitted or is not available yet." }, 409);
      const { data: network } = await db.from("job_network_profiles").select("application_id").eq("application_id", assignment.application_id).eq("candidate_id", uid).maybeSingle();
      if (!network) return json({ error: "Complete your network setup before submitting tasks." }, 403);
      const { data: template, error: templateError } = await db.from("job_task_templates").select("id,title,max_reward").eq("id", assignment.task_template_id).eq("is_published", true).maybeSingle();
      if (templateError || !template) return json({ error: "The task is not available for grading." }, 404);
      const { data: key, error: keyError } = await db.rpc("remote_way_get_task_answer_key", { p_template_id: assignment.task_template_id });
      if (keyError || !key) return json({ error: "The grading rubric is temporarily unavailable. Please try again later." }, 500);
      const count = wordsIn(responseText);
      const minWords = Number(key.minimum_words || 35);
      const keywords = Array.isArray(key.required_keywords) ? key.required_keywords.map((k: any) => String(k)) : [];
      const matched = keywords.filter((k: string) => keywordMatches(responseText, k));
      const coverage = keywords.length ? matched.length / keywords.length : 0.5;
      const lengthScore = Math.min(1, count / minWords);
      const structureGroups = [
        ["first","step","begin","start","initially"],
        ["decision","recommend","resolve","record","route","calculate","choose","result","output","classify","match"],
        ["verify","check","accuracy","quality","privacy","confidential","review","validate","audit","confirm"],
        ["follow-up","follow up","deadline","escalate","owner","handoff","next action","next step","schedule","notify","document"]
      ];
      const normalizedResponse = normalize(responseText);
      const structureHits = structureGroups.filter((group: string[]) => group.some(term => (" " + normalizedResponse + " ").includes(" " + normalize(term) + " "))).length;
      const structureScore = structureHits / structureGroups.length;
      const quality = Math.max(0, Math.min(100, Math.round((coverage * 0.65 + structureScore * 0.25 + lengthScore * 0.10) * 100)));
      const completion = count < 8 ? 0 : Math.min(100, Math.round((count / minWords) * 100));
      let band = "invalid";
      if (count >= 8) band = quality >= 85 ? "excellent" : quality >= 60 ? "average" : quality >= 30 ? "poor" : "invalid";
      const feedback = count < minWords
        ? "Your response was received, but it is shorter than the task's 35-word target. Add the steps, your decision, a quality or privacy check, and the next action."
        : band === "excellent"
          ? "Excellent work. Your response is complete and covers the main rubric concepts. Keep the same clear structure and quality checks."
          : band === "average"
            ? "Good start. Your response covers some of the rubric concepts. Make the decision clearer and add a stronger accuracy/privacy check and follow-up."
            : band === "poor"
              ? "Your response needs more detail. Explain the steps in order, justify the decision, and include a quality check and a concrete next action."
              : "The response did not meet the minimum quality threshold. Review the instructions and provide a complete, relevant answer.";
      const { data: grade, error: gradeError } = await db.rpc("remote_way_record_task_submission", {
        p_candidate_id: uid, p_assignment_id: assignmentId, p_response: responseText,
        p_completion: completion, p_quality: quality, p_grade_band: band, p_feedback: feedback,
      });
      if (gradeError) return json({ error: gradeError.message }, 400);
      return json({ ok: true, grade, task_title: template.title });
    }

    if (body.action === "request_payout") {
      const amount = Number(body.amount);
      const methodId = Number(body.payout_method_id);
      if (!Number.isFinite(amount) || !Number.isSafeInteger(methodId) || methodId <= 0) return json({ error: "Enter a valid amount and choose an active payout method." }, 400);
      const { data: payout, error: payoutError } = await db.rpc("remote_way_request_payout", {
        p_candidate_id: uid, p_amount: amount, p_method_id: methodId,
        p_details: body.request_details && typeof body.request_details === "object" && !Array.isArray(body.request_details) ? body.request_details : {},
      });
      if (payoutError) return json({ error: payoutError.message.replace(/^.*?ERROR:\\s*/,"") }, 400);
      return json({ ok: true, payout });
    }

    return json({ error: "Unknown work action." }, 400);
  }),
};