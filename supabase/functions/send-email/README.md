# RemoteWay Email Studio → Supabase Auth Send Email Hook

This function reads the existing `public.site_settings` row with key `email_templates` as the source of truth. It does not create duplicate Auth templates or change the Admin → Studio UI.

## Behavior
- Supabase Auth calls the HTTPS Edge Function for authentication email events.
- The function verifies Supabase's Standard Webhooks signature before processing.
- It loads the saved Email Studio template JSON on each send, so Studio edits take effect without copying templates into Supabase Auth.
- Sign-up uses the existing `verification` template; password recovery uses the existing `reset` template.
- Other Auth actions use the verification template as a fallback because the current Studio has no dedicated magic-link, invite, email-change, or reauthentication templates.
- Template text is escaped, line breaks are preserved, and Supabase Auth token hashes are used to build action links.

## Required Edge Function secrets
- `RESEND_API_KEY`
- `EMAIL_FROM` (defaults to `RemoteWay <support@remoteway.work>`)
- `SEND_EMAIL_HOOK_SECRET` (the signing secret configured for the Auth hook)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (normally injected by Supabase for hosted functions)

Never commit secret values.

## Activation
1. Deploy the function with JWT verification disabled because Supabase Auth calls it server-to-server and it authenticates requests with the signed webhook payload.
2. In Supabase Dashboard → Authentication → Hooks, configure an HTTPS **Send Email** hook pointing to `https://grtnpvoyqeogzgeyiqce.supabase.co/functions/v1/send-email`.
3. Configure the exact same signing secret as the Edge Function secret `SEND_EMAIL_HOOK_SECRET`.
4. Enable/save the hook. Supabase Auth will use this hook instead of its built-in email delivery for authentication emails.
5. Test signup and password recovery before relying on it in production. Email confirmation must be enabled to test the signup verification path.

## Compatibility note
The hook replaces Supabase Auth email delivery; it is not merely a template override. If the hook fails, the auth action can fail too. Test signup, recovery, magic link, invite, and email change before relying on it in production.
