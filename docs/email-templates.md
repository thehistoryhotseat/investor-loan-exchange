# Sign-in email template (ready for custom SMTP)

Supabase auth emails use the service defaults until custom SMTP is set up.
The default sender only delivers to the project's own team addresses (about
2 emails/hour), so SMTP is a blocker for the first real lender, not a
branding nicety. Set the sender name to "Investor Loan Exchange".

## Magic link (portal sign-in) - draft from the design review

Subject: Your Investor Loan Exchange sign-in link

```html
<h2>Sign in to Investor Loan Exchange</h2>
<p>Use the link below to open your lender portal. It works once and expires shortly.</p>
<p><a href='{{ .ConfirmationURL }}'>Sign in to the portal</a></p>
<p>If you didn't ask for this, you can ignore this email.</p>
<p>Investor Loan Exchange</p>
```

- Change "expires shortly" to an exact time once the owner sets the link
  expiry in Supabase.
- The footer line waits on the owner's choice of business name.
- A separate Invite template exists; it only matters if lenders are added
  from the Supabase dashboard instead of the portal flow.
