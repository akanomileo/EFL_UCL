# Fixture Date/Time Admin Upgrade

This version adds optional fixture date and time controls.

## New admin feature
Go to:

Admin → Fixtures + Optional Schedule

You can now:
- Generate group fixtures
- Leave date/time blank if schedule is not confirmed
- Apply one date/time to all fixtures
- Edit date/time individually for every fixture
- Save all fixture schedules at once
- Clear only date/time without deleting fixtures or scores

## Setup
1. Upload all files to your existing GitHub repository.
2. Commit changes.
3. Open your website `/admin.html`.
4. Login with your admin PIN.
5. Go to Fixtures + Optional Schedule.
6. Generate fixtures or edit existing fixture date/time.
7. Click Save Fixture Date/Time.
8. Refresh `fixtures.html`.

## Supabase
No new Supabase table is required.
The existing `matches` data already stores `date` and `time`.
