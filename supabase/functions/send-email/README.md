# RemoteWay Email Studio → Supabase Auth Send Email Hook

This function is designed to use the existing `public.site_settings` row with key `email_templates` as the source of truth. It does not create duplicate Auth HTML templates and does not change the Admin → Studio UI.

## Behavior
- Supabase Auth calls this HTTPS Edge Function for authentication email events.
- The function verifies Supabase's Standard Webhooks signature before processing the request.
- It loads the current saved Email Studio template JSON on every send, so Studio edits take effect without copying templates into Supabase Auth.
- Sign-up uses the existing `verification` template; password recovery uses the existing `reset` template.
- Other Auth actions use the existing verification template as a fallback because the current Studio has no dedicated magic-link, invite, email-change, or reauthentication template IDs.
- Template text is escaped and line breaks/HTTPS URLs are rendered as HTML. Supabase's secure token hash and redirect target are used to build the verification URL.

## Required Supabase Function secrets
- `RESEND_API_KEY`
- `EMAIL_FROM` (for example `RemoteWay <support@remoteway.work>`)
- `SEND_EMAIL_HOOK_SECRET` (the signing secret generated when creating the Send Email Auth Hook; preserve the `v1,whsec_` prefix or the function accepts the stripped value)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The existing project may already have the first, second, fourth, and fifth values configured for other functions. Confirm without exposing the values. Never commit secret values.

## Activation
1. Deploy this function with JWT verification disabled, because Supabase Auth calls it server-to-server and it authenticates requests with the signed webhook payload.
2. In Supabase Dashboard → Authentication → Hooks, create an HTTPS **Send Email** hook pointing to `https://grtnpvoyqeogzgeyiqce.supabase.co/functions/v1/send-email`.
3. Generate a signing secret in the hook configuration and set that exact secret as the Edge Function secret `SEND_EMAIL_HOOK_SECRET`.
4. Save/enable the hook. When enabled, Auth's configured SMTP path is bypassed for these authentication messages.
5. Test a new signup and password recovery. Keep email confirmation enabled for the signup test.

## Important compatibility note
The hook replaces Supabase Auth email delivery; it is not a template-only override. If the hook fails, the auth action can fail too. Test signup, recovery, magic link, invite, and email change before relying on it in production.
