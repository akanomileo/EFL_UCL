# Knockout Pending VS Fix

This version fixes the bracket display issue where an unplayed knockout match could appear as 0-0.

## What changed
For knockout rounds only:
- If a match has 0-0 and no winner, the public Bracket page displays `vs`
- The admin knockout result inputs show blank instead of 0-0 for pending generated matches
- Group-stage 0-0 draws are not affected

## Why
Knockout matches cannot end as a normal 0-0 draw, so showing 0-0 before the match is played looks wrong.

## Setup
1. Upload all files to your UCL GitHub repo root.
2. Commit changes.
3. Wait 1-3 minutes.
4. Open bracket.html.
5. Press Ctrl + F5.
