# UCL New Format + Top Scoring Team Upgrade

## Added features

1. Top Scorers / Top Scoring Teams page
   - New page: `topscorers.html`
   - Navbar link added
   - Leading team shown in a large dark feature card
   - Full ranking table included
   - Goals are counted from League Phase and Knockout legs

2. New 24-team UCL format
   - Tournament mode: `ucl_new`
   - Default team limit: 24
   - League Phase fixtures generator
   - Default league phase matches per team: 4
   - Standings show UCL qualification status:
     - Rank 1-8: Round of 16
     - Rank 9-24: Knockout Playoff

3. Knockout Best of 2 system
   - Knockout ties generate two legs automatically
   - Aggregate score decides the winner
   - Knockout Playoff -> Round of 16 -> Quarter Finals -> Semi Finals -> Final

4. Knockout deadline elimination rule
   - League phase blank results after deadline still become 0-0
   - Knockout blank results after that round deadline do NOT become 0-0
   - Instead, both teams in that tie are marked eliminated automatically
   - When generating the next round, eliminated ties are skipped
   - If needed, remaining teams can receive BYE advancement

## Recommended workflow

1. Go to Admin > Tournament Settings
2. Click `Apply UCL 24-Team Defaults`
3. Go to Admin > Teams
4. Paste 24 teams
5. Generate UCL League Phase fixtures
6. Enter league phase results
7. Generate UCL Playoff
8. Set knockout deadlines
9. Enter two-leg aggregate results
10. Generate each next round
