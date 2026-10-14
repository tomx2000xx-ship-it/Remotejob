# RemoteWay — Supabase Auth email templates

These HTML files are prepared for the **built-in Supabase Auth email system**. They are not sent by the website directly. Supabase renders the template variables and generates the real, single-use authentication link.

## Templates

| File | Supabase Auth template |
|---|---|
| `confirmation.html` | Confirm signup |
| `recovery.html` | Reset password |
| `magic_link.html` | Magic link |
| `email_change.html` | Change email address |
| `invite.html` | Invite user |
| `reauthentication.html` | Reauthentication code |

## Dashboard setup — do this after reviewing the files

1. Open the [RemoteWay Supabase project](https://supabase.com/dashboard/project/grtnpvoyqeogzgeyiqce).
2. Go to **Authentication → SMTP Settings** (the exact navigation label may vary) and enable **Custom SMTP**.
3. Enter the Resend SMTP details:
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) or `587` (STARTTLS)
   - **Username:** `resend`
   - **Password:** your Resend API key — paste it only into the Supabase dashboard, never into GitHub or these files.
   - **Sender email:** `support@remoteway.work`
   - **Sender name:** `RemoteWay`
4. Save the SMTP settings. If Supabase rejects the sender, first confirm that `remoteway.work` is verified in Resend and that the sender address is permitted.
5. Open **Authentication → Email Templates**. Open each matching template and copy the HTML from this repository into its **Message body**. Use these subjects:
   - Confirm signup: `Confirm your RemoteWay email`
   - Reset password: `Reset your RemoteWay password`
   - Magic link: `Your RemoteWay sign-in link`
   - Change email: `Confirm your new RemoteWay email`
   - Invite user: `Your invitation to RemoteWay`
   - Reauthentication: `Verify your RemoteWay identity`
6. Open **Authentication → URL Configuration**:
   - Set **Site URL** to `https://remoteway.work`.
   - Ensure `https://remoteway.work/auth-callback` is in the allowed redirect URLs. Add any development callback URL only if you actually use it.
7. Open **Authentication → Providers → Email** (or the current Email provider settings) and enable **Confirm email**. This was previously switched off, so signup confirmation emails will not be sent until it is enabled.
8. Save the changes.

## Why the authentication links remain real

The confirmation, recovery, magic-link, email-change, and invite templates use Supabase's `{{ .ConfirmationURL }}` variable. Supabase replaces it with the actual flow-specific, time-limited URL. The reauthentication template uses `{{ .Token }}` for the one-time code. Do not replace these variables with a hard-coded website URL.

The current React signup code redirects to `window.location.origin + "/auth-callback"`. The production domain therefore needs the matching redirect URL allowed in Supabase.

## Safe test sequence

1. Save SMTP and the templates first.
2. Re-enable email confirmation.
3. Register a **new test email address** through the live RemoteWay signup form.
4. Check inbox and spam folders. Confirm the sender displays as **RemoteWay** from `support@remoteway.work`, the visual branding is present, and the button's URL points to the Supabase verification flow.
5. Open the button once and confirm it returns to RemoteWay through `/auth-callback`.
6. Test password reset separately using the site's **Forgot password** flow.

A user already registered in Supabase may not receive a fresh signup-confirmation email by attempting signup again. Use a genuinely new test address or the app's resend-confirmation action for an existing unconfirmed account.

## Important boundaries

- These files are prepared in the repository, but they do **not** change the hosted project's settings automatically.
- Do not put a Resend API key, Supabase service-role key, or SMTP password in this repository.
- The Supabase Auth SMTP settings control Auth emails. Application emails sent by RemoteWay's separate Edge Functions are a separate delivery path and need their own sender configuration.
