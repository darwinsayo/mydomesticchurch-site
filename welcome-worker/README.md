# Welcome-email helper

Every 30 minutes it looks for new tester sign-ups (the `mdc-waitlist` database) and emails Darwin a draft thank-you email with four buttons: **Send** (goes out at 8 AM Eastern the next morning), **Send now**, **Edit first**, **Skip**. Nothing reaches a family until Darwin presses one. Sign-ups from before this was switched on are never emailed.

Setup, once:
1. In Cloudflare, Workers & Pages, `mdc-welcome`, Settings, Variables and secrets: add secret `RESEND_API_KEY` (a Resend sending key) and secret `WELCOME_SECRET` (any long random text).
2. Run "Deploy welcome helper" in GitHub Actions (the repository secret `CLOUDFLARE_API_TOKEN` must be allowed to edit Workers).
