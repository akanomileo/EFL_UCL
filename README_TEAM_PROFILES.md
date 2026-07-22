# Team Profiles Upgrade

## Public feature
- Open `teams.html`.
- Click any team card.
- The profile opens at `team.html?id=TEAM_ID`.
- Each profile displays:
  - Team logo and name
  - Current competition statistics
  - Upcoming fixtures with deadlines
  - Completed results
  - Team contact information

## Admin contact setup
1. Open Admin.
2. Choose **Teams**.
3. Enter phone, email, Messenger link, or another contact in the Contact column.
4. Click **Save Contact**.
5. Use **Open Profile** to preview the public page.

Contact information is stored inside the existing team object, so no Supabase schema migration is required.
