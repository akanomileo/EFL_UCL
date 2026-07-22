/*
  EFL Team Profile Upgrade
  - Clickable team cards
  - One public profile page per team
  - Upcoming fixtures, completed results, and contact information
  - Contact editing in Admin -> Teams
*/
(function () {
  const baseShowAdminTab = window.showAdminTab;
  const baseRerenderCurrentPage = window.rerenderCurrentPage;

  function teamProfileUrl(team) {
    return `team.html?id=${encodeURIComponent(String(team.id))}`;
  }

  function matchTimestamp(match) {
    if (!match || !match.date || match.date === 'TBA') return null;
    const time = match.time && match.time !== 'TBA' ? match.time : '23:59';
    const date = new Date(`${match.date}T${time}`);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }

  function sortUpcoming(matches) {
    return [...matches].sort((a, b) => {
      const aTime = matchTimestamp(a);
      const bTime = matchTimestamp(b);
      if (aTime === null && bTime === null) return Number(a.id || 0) - Number(b.id || 0);
      if (aTime === null) return 1;
      if (bTime === null) return -1;
      return aTime - bTime;
    });
  }

  function sortResults(matches) {
    return [...matches].sort((a, b) => {
      const aTime = matchTimestamp(a);
      const bTime = matchTimestamp(b);
      if (aTime === null && bTime === null) return Number(b.id || 0) - Number(a.id || 0);
      if (aTime === null) return 1;
      if (bTime === null) return -1;
      return bTime - aTime;
    });
  }

  function contactLineHtml(line) {
    const text = String(line || '').trim();
    if (!text) return '';
    const safe = escapeHtml(text);

    if (/^https?:\/\//i.test(text)) {
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`;
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      return `<a href="mailto:${safe}">${safe}</a>`;
    }
    if (/^\+?[\d\s().-]{7,}$/.test(text)) {
      const telephone = text.replace(/[^+\d]/g, '');
      return `<a href="tel:${escapeHtml(telephone)}">${safe}</a>`;
    }
    return safe;
  }

  function contactHtml(contact) {
    const lines = String(contact || '').split(/\r?\n/).map(contactLineHtml).filter(Boolean);
    if (!lines.length) return '<p class="small">Contact information has not been added yet.</p>';
    return `<div class="team-contact-lines">${lines.map((line) => `<div>${line}</div>`).join('')}</div>`;
  }

  function teamStats(teamName) {
    const row = standings().find((item) => item.team === teamName);
    if (!row) return null;
    return row;
  }

  function profileMatchBlock(match, upcoming) {
    const stage = match.round || match.group || 'Fixture';
    const leg = match.leg ? ` • Leg ${match.leg}` : '';
    let decision = '';
    if (!upcoming && match.round === 'Final' && match.decidedWinner) {
      const hasPens = match.penaltyHomeScore !== '' && match.penaltyAwayScore !== '' && match.penaltyHomeScore !== undefined && match.penaltyAwayScore !== undefined;
      decision = `<div class="profile-match-note">Winner after penalties: <b>${escapeHtml(match.decidedWinner)}</b>${hasPens ? ` (${escapeHtml(match.penaltyHomeScore)}-${escapeHtml(match.penaltyAwayScore)})` : ''}</div>`;
    }
    return `<div class="profile-match-card"><div class="profile-match-stage">${escapeHtml(stage)}${escapeHtml(leg)}</div>${matchCard(match, false, upcoming, data().settings)}${decision}</div>`;
  }

  window.renderTeams = renderTeams = function () {
    init('teams');
    const { teams, settings } = data();

    const card = (team, label) => `<a class="card team-card team-card-link" href="${teamProfileUrl(team)}" aria-label="View ${escapeHtml(team.name)} profile">${teamLogoHtml(team.name, 'team-card-logo')}<div class="team-card-copy"><h3>${escapeHtml(team.name)}</h3><span class="tag">${escapeHtml(label)}</span><span class="team-profile-cta">View team profile →</span></div></a>`;

    if (isUclNewFormat(settings)) {
      document.querySelector('#app').innerHTML = `<section class="section"><div class="wrap"><div class="title"><h2>Teams</h2><span class="tag">${teams.length}/${settings.teamLimit || 24} teams</span></div><div class="grid team-profile-grid">${teams.map((team, index) => card(team, `League Phase #${index + 1}`)).join('') || '<p>No teams yet.</p>'}</div></div></section>`;
      return;
    }

    const groups = [...new Set(teams.map((team) => team.group))].sort();
    document.querySelector('#app').innerHTML = `<section class="section"><div class="wrap"><h2>Teams</h2>${groups.map((group) => `<h3 class="group-title">Group ${escapeHtml(group)}</h3><div class="grid team-profile-grid">${teams.filter((team) => team.group === group).map((team) => card(team, `Group ${group}`)).join('')}</div>`).join('') || '<p>No teams yet.</p>'}</div></section>`;
  };

  window.renderTeamProfile = renderTeamProfile = function () {
    applyResultDeadlineDefaults();
    init('teams');

    const params = new URLSearchParams(location.search);
    const requestedId = params.get('id');
    const tournamentData = data();
    const team = tournamentData.teams.find((item) => String(item.id) === String(requestedId));

    if (!team) {
      document.querySelector('#app').innerHTML = `<section class="section"><div class="wrap"><div class="card team-not-found"><h2>Team not found</h2><p class="small">This team may have been renamed or removed.</p><a class="btn" href="teams.html">Back to Teams</a></div></div></section>`;
      return;
    }

    document.title = `${team.name} | ${tournamentName(tournamentData.settings)}`;

    const teamMatches = tournamentData.matches.filter((match) => match.home === team.name || match.away === team.name);
    const upcoming = sortUpcoming(teamMatches.filter((match) => !match.autoBye && !match.autoEliminated && !hasNumericScore(match)));
    const results = sortResults(teamMatches.filter((match) => hasNumericScore(match)));
    const stats = teamStats(team.name);
    const rank = standings().findIndex((row) => row.team === team.name) + 1;

    const statsHtml = stats
      ? `<div class="team-profile-stats"><div><b>${rank || '-'}</b><span>Position</span></div><div><b>${stats.P}</b><span>Played</span></div><div><b>${stats.W}</b><span>Wins</span></div><div><b>${stats.GD}</b><span>Goal Difference</span></div><div><b>${stats.Pts}</b><span>Points</span></div></div>`
      : '';

    document.querySelector('#app').innerHTML = `<section class="section team-profile-section"><div class="wrap"><a class="team-back-link" href="teams.html">← Back to Teams</a><div class="team-profile-hero card"><div class="team-profile-logo-wrap">${teamLogoHtml(team.name, 'team-profile-logo')}</div><div class="team-profile-heading"><span class="tag">${escapeHtml(isUclNewFormat(tournamentData.settings) ? 'League Phase' : `Group ${team.group || '-'}`)}</span><h1>${escapeHtml(team.name)}</h1><p class="small">Team information, schedule and competition record.</p></div></div>${statsHtml}<div class="team-profile-layout"><div class="team-profile-main"><section><div class="title"><h2>Upcoming Fixtures</h2><span class="tag">${upcoming.length}</span></div><div class="card profile-match-list">${upcoming.map((match) => profileMatchBlock(match, true)).join('') || '<p class="small empty-profile-state">No upcoming fixtures.</p>'}</div></section><section><div class="title"><h2>Results</h2><span class="tag">${results.length}</span></div><div class="card profile-match-list">${results.map((match) => profileMatchBlock(match, false)).join('') || '<p class="small empty-profile-state">No completed results yet.</p>'}</div></section></div><aside class="team-profile-side"><div class="card team-contact-card"><div class="team-contact-icon">☎</div><h2>Contact</h2>${contactHtml(team.contact)}</div></aside></div></div></section>`;
  };

  window.updateTeamContact = function (id, contact) {
    const tournamentData = data();
    tournamentData.teams = tournamentData.teams.map((team) => String(team.id) === String(id) ? { ...team, contact: String(contact || '').trim() } : team);
    setData({ teams: tournamentData.teams });
    adminMessage('Team contact saved.', 'ok');
  };

  function enhanceTeamAdmin() {
    const content = document.querySelector('#adminContent');
    if (!content) return;

    const compactForm = content.querySelector('.tool-card .form.compact');
    if (compactForm && !compactForm.querySelector('#teamContact')) {
      const addButton = compactForm.querySelector('button');
      const contactInput = document.createElement('input');
      contactInput.id = 'teamContact';
      contactInput.placeholder = 'Contact: phone, email or link';
      compactForm.insertBefore(contactInput, addButton || null);
    }

    const tables = [...content.querySelectorAll('table.table')];
    const teamTable = tables.find((table) => {
      const headings = [...table.querySelectorAll('th')].map((th) => th.textContent.trim());
      return headings.includes('Team') && headings.includes('Action');
    });
    if (!teamTable || teamTable.dataset.profileEnhanced === 'true') return;
    teamTable.dataset.profileEnhanced = 'true';

    const headerRow = teamTable.querySelector('tr');
    const actionHeader = headerRow && headerRow.lastElementChild;
    if (actionHeader) actionHeader.insertAdjacentHTML('beforebegin', '<th>Contact</th>');

    const teams = data().teams;
    const rows = [...teamTable.querySelectorAll('tr')].slice(1);
    rows.forEach((row, index) => {
      const team = teams[index];
      if (!team || row.children.length < 2) return;
      const actionCell = row.lastElementChild;
      const contactCell = document.createElement('td');
      contactCell.innerHTML = `<textarea class="team-contact-input" rows="3" placeholder="Phone, email, Messenger link...">${escapeHtml(team.contact || '')}</textarea><button class="mini-btn" type="button">Save Contact</button><a class="admin-profile-link" href="${teamProfileUrl(team)}" target="_blank" rel="noopener">Open Profile</a>`;
      const textarea = contactCell.querySelector('textarea');
      contactCell.querySelector('button').addEventListener('click', () => window.updateTeamContact(team.id, textarea.value));
      actionCell.parentNode.insertBefore(contactCell, actionCell);
    });
  }

  window.showAdminTab = showAdminTab = function (tab) {
    baseShowAdminTab(tab);
    if (tab === 'teams') enhanceTeamAdmin();
  };

  const baseAddTeam = window.addTeam;
  window.addTeam = function () {
    const contact = (document.querySelector('#teamContact')?.value || '').trim();
    const beforeIds = new Set(data().teams.map((team) => String(team.id)));
    baseAddTeam();
    if (!contact) return;

    const tournamentData = data();
    const created = [...tournamentData.teams].reverse().find((team) => !beforeIds.has(String(team.id)));
    if (!created) return;
    tournamentData.teams = tournamentData.teams.map((team) => String(team.id) === String(created.id) ? { ...team, contact } : team);
    setData({ teams: tournamentData.teams });
    showAdminTab('teams');
    adminMessage('Team and contact added.', 'ok');
  };

  window.rerenderCurrentPage = function () {
    const page = location.pathname.split('/').pop() || 'index.html';
    if (page === 'team.html') return renderTeamProfile();
    return baseRerenderCurrentPage();
  };
})();
