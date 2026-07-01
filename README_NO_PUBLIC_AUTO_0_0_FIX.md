# No Public Auto 0-0 Fix

This version fixes the issue where pending matches were turning into 0-0 draws whenever a normal user opened the website.

## Main change
- Public pages do not automatically apply deadline rules.
- Admin saving deadlines does not automatically convert blank results.
- Only the Admin button **Apply Due Rules Now** processes deadline rules.
- Added **Undo Auto 0-0** button to restore previous auto-generated 0-0 league results back to pending.

## Important
If your browser already has old 0-0 auto results saved in localStorage, go to:
Admin → League Results → Undo Auto 0-0
