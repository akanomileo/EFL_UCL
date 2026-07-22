# EFL UCL Reliability Upgrade

## Added

- The Final remains a single-leg match.
- If the Final score is level, Admin can select the winner after penalties.
- Optional penalty scores can be saved and shown in the bracket.
- The bracket displays a Champion banner once the Final winner is decided.
- Renaming a team now updates all existing fixtures, results, knockout tie references, and Final winner records.
- Team logos are preserved when teams are shuffled or re-imported with the same names.
- Rank and Team columns stay visible while scrolling standings on mobile.
- Public fixture cards continue to display their applicable deadlines.

## Final result workflow

1. Open Admin → Knockout.
2. Enter the Final match score.
3. When the score is level, select the deciding winner.
4. Optionally enter both penalty scores.
5. Click Save Knockout Results.

## Security note

The included Supabase configuration still uses public database write policies for compatibility with the current PIN-based static website. The admin PIN protects the interface, but it is not a replacement for Supabase Authentication and admin-only Row Level Security.
