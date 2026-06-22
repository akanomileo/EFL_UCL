# EFL Management Upgrade

This version adds faster admin management tools:

## New Admin Features

1. **Bulk Team Paste**
   - Go to `admin.html` → `Bulk Teams + Groups`.
   - Paste one team per line.
   - Click **Create Groups Automatically**.
   - The website shuffles teams and assigns them evenly into groups.

2. **Auto Fixture Generation**
   - Keep **Generate group fixtures after grouping** checked.
   - Fixtures are created automatically after group shuffle.

3. **Shuffle Existing Teams**
   - Click **Shuffle Existing Teams** to reshuffle current teams into groups.
   - Fixtures regenerate automatically.

4. **Fast Result Entry**
   - Go to `admin.html` → `Fast Result Entry`.
   - Enter all results on one screen.
   - Click **Save All Results**.

## Important

Before pasting many teams, check:

- `Tournament Settings` → Number of groups
- `Tournament Settings` → Teams per group

Example:

- 8 groups × 4 teams per group = 32 teams capacity
- 6 groups × 4 teams per group = 24 teams capacity

If you paste more than the capacity, the system will stop and ask you to increase the settings first.
