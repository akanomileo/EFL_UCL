# EFL Website + Supabase Setup Guide

This version uses Supabase instead of Firebase.

## Files you will edit

Edit only this file first:

```text
supabase-sync.js
```

Replace:

```javascript
const SUPABASE_URL = "https://gcxlwxqqpiopverfznyn.supabase.co";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";
```

with your real values from Supabase.

---

## Step 1: Create Supabase project

1. Go to Supabase.
2. Create a new project.
3. Wait until the project finishes building.

---

## Step 2: Create the database table

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Click **New query**.
4. Open `supabase-setup.sql` from this folder.
5. Copy all SQL code.
6. Paste it into Supabase SQL Editor.
7. Click **Run**.

This creates one table:

```text
efl_data
```

It stores:

```text
settings
teams
matches
```

---

## Step 3: Get Supabase URL and anon key

1. Go to **Project Settings**.
2. Go to **Data API**.
3. Copy **Project URL**.
4. Copy **anon public key**.
5. Paste both values into `supabase-sync.js`.

---

## Step 4: Upload files to GitHub

Upload all files in this folder to your GitHub repository.

Important files:

```text
index.html
admin.html
app.js
style.css
supabase-sync.js
supabase-setup.sql
```

---

## Step 5: Test website

1. Open your live website.
2. Open `admin.html`.
3. Login with PIN `1234`.
4. Add one team.
5. Go to Supabase → Table Editor → `efl_data`.
6. Check if the `teams` row changed.

---

## Warning

The included SQL uses public read/write policies for fast testing.
That means anyone who knows your site structure could write data.
For production, use Supabase Auth and admin-only policies.


## Important fix in this version

All HTML files now load the Supabase CDN and `supabase-sync.js`. They no longer reference `firebase-sync.js`.
