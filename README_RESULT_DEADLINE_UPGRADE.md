# Result Deadline + Auto 0-0 Draw Upgrade

This version adds a result filling deadline.

## New admin feature
Go to:

Admin → Fast Result Entry → Result filling deadline

You can:
- Set a deadline date
- Set a deadline time
- Automatically convert blank results to 0-0 draws after the deadline
- Still edit the results later as admin

## Important behavior
This is a static website, so the automatic 0-0 conversion runs when the website/admin page is opened after the deadline. It is not a background server cron job.

Example:
- Deadline: 2026-06-25 18:00
- A match has no score
- After 18:00, opening the website/admin page applies 0-0 automatically
- Admin can later change 0-0 to the real score

## Setup
1. Upload all files to GitHub.
2. Commit changes.
3. Open `/admin.html`.
4. Go to Fast Result Entry.
5. Set Result filling deadline.
6. Click Save Deadline.
7. After the deadline, blank results become 0-0 draws.
