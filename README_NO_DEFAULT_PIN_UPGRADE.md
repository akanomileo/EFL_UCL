# No Default PIN Upgrade

This version removes the visible "Default PIN: 1234" message and removes 1234 as the default fallback in the code.

## What changed
- Login page no longer displays "Default PIN: 1234"
- New projects start with no admin PIN
- If no PIN exists, admin page shows "Create Admin PIN"
- Admin PIN must be at least 4 characters
- Tournament Settings still lets you change the admin PIN later

## Existing Supabase users
If your current Supabase settings still use 1234, you have two options:

### Easy option
1. Upload these files to GitHub.
2. Open `/admin.html`.
3. Login using your current PIN.
4. Go to Tournament Settings.
5. Change Admin PIN.
6. Save Settings.

### Stronger option
Run this SQL in Supabase SQL Editor:

update public.efl_data
set value = jsonb_set(value, '{adminPin}', '""'::jsonb, true),
    updated_at = now()
where key = 'settings'
  and value->>'adminPin' = '1234';

Then open `/admin.html` and create a new PIN.
