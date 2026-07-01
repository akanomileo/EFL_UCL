const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));
const GROUPS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function read(k, d) {
  try {
    const value = JSON.parse(localStorage.getItem(k));
    return value ?? d;
  } catch {
    return d;
  }
}

function save(k, v) {
  localStorage.setItem(k, JSON.stringify(v));
  if (window.firebaseEFL && window.firebaseEFL.saveKey) {
    window.firebaseEFL.saveKey(k, v);
  }
}

const defaults = {
  settings: {
    tournamentName: 'Elite Football League',
    teamLimit: 48,
    groupCount: 8,
    qualifyPerGroup: 2,
    teamsPerGroup: 4,
    resultDeadlineDate: '',
    resultDeadlineTime: '',
    knockoutDeadlines: {},
    adminPin: ''
  },
  teams: [
    { id: 1, name: 'Team A', group: 'A' },
    { id: 2, name: 'Team B', group: 'A' },
    { id: 3, name: 'Team C', group: 'A' },
    { id: 4, name: 'Team D', group: 'A' },
    { id: 5, name: 'Team E', group: 'B' },
    { id: 6, name: 'Team F', group: 'B' },
    { id: 7, name: 'Team G', group: 'B' },
    { id: 8, name: 'Team H', group: 'B' }
  ],
  matches: [
    { id: 1, round: 'Group Stage', group: 'A', home: 'Team A', away: 'Team B', homeScore: '', awayScore: '', date: '2026-06-10', time: '16:00' },
    { id: 2, round: 'Group Stage', group: 'A', home: 'Team C', away: 'Team D', homeScore: '', awayScore: '', date: '2026-06-10', time: '18:00' },
    { id: 3, round: 'Group Stage', group: 'B', home: 'Team E', away: 'Team F', homeScore: '', awayScore: '', date: '2026-06-11', time: '16:00' },
    { id: 4, round: 'Group Stage', group: 'B', home: 'Team G', away: 'Team H', homeScore: '', awayScore: '', date: '2026-06-11', time: '18:00' }
  ]
};

function data() {
  return {
    settings: { ...defaults.settings, ...read('efl_settings', defaults.settings) },
    teams: read('efl_teams', defaults.teams),
    matches: read('efl_matches', defaults.matches)
  };
}

function tournamentName(settings) {
  const s = settings || data().settings;
  return String(s.tournamentName || defaults.settings.tournamentName).trim() || defaults.settings.tournamentName;
}

function resultDeadlineDateTime(settings) {
  const s = settings || data().settings;
  const date = String(s.resultDeadlineDate || '').trim();
  const time = String(s.resultDeadlineTime || '').trim();

  if (!date || !time) return null;

  const dt = new Date(`${date}T${time}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function resultDeadlineText(settings) {
  const s = settings || data().settings;
  if (!s.resultDeadlineDate || !s.resultDeadlineTime) return 'No result deadline set';
  return `${s.resultDeadlineDate} ${s.resultDeadlineTime}`;
}

function isResultDeadlinePassed(settings) {
  const dt = resultDeadlineDateTime(settings);
  return Boolean(dt && Date.now() > dt.getTime());
}

function knockoutDeadlineDateTime(settings, round) {
  const d = (settings.knockoutDeadlines || {})[round] || {};
  if (!d.date || !d.time) return null;
  const dt = new Date(`${d.date}T${d.time}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function isKnockoutDeadlinePassed(settings, round) {
  const dt = knockoutDeadlineDateTime(settings, round);
  return Boolean(dt && Date.now() > dt.getTime());
}

function knockoutDeadlineText(settings, round) {
  const d = (settings.knockoutDeadlines || {})[round] || {};
  if (!d.date || !d.time) return 'No deadline set';
  return `${d.date} ${d.time}`;
}

function matchDeadlinePassed(settings, match) {
  if (match.round === 'Group Stage') {
    return isResultDeadlinePassed(settings);
  }
  return isKnockoutDeadlinePassed(settings, match.round);
}

function applyResultDeadlineDefaults() {
  const d = data();
  let changed = 0;

  d.matches = d.matches.map((m) => {
    if (!matchDeadlinePassed(d.settings, m)) return m;

    const missingHome = m.homeScore === '' || m.homeScore === null || m.homeScore === undefined;
    const missingAway = m.awayScore === '' || m.awayScore === null || m.awayScore === undefined;

    if (missingHome && missingAway) {
      changed += 1;
      return {
        ...m,
        homeScore: '0',
        awayScore: '0',
        autoDrawApplied: true,
        autoDrawAppliedAt: new Date().toISOString()
      };
    }

    return m;
  });

  if (changed > 0) {
    setData({ matches: d.matches });
  }

  return changed;
}

function setData(o) {
  if (o.settings) save('efl_settings', o.settings);
  if (o.teams) save('efl_teams', o.teams);
  if (o.matches) save('efl_matches', o.matches);
}

function rerenderCurrentPage() {
  const p = location.pathname.split('/').pop() || 'index.html';
  if (p === 'index.html') renderHome();
  else if (p === 'fixtures.html') renderFixtures();
  else if (p === 'results.html') renderResults();
  else if (p === 'standings.html') renderStandings();
  else if (p === 'teams.html') renderTeams();
  else if (p === 'bracket.html') renderBracket();
  else if (p === 'admin.html') renderAdmin();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function layout(active) {
  const name = escapeHtml(tournamentName());
  return `<header class="top"><div class="wrap nav"><a class="brand" href="index.html"><img src="logo.png"><span>${name}</span></a><nav class="links"><a class="${active === 'home' ? 'active' : ''}" href="index.html">Home</a><a class="${active === 'fixtures' ? 'active' : ''}" href="fixtures.html">Fixtures</a><a class="${active === 'results' ? 'active' : ''}" href="results.html">Results</a><a class="${active === 'standings' ? 'active' : ''}" href="standings.html">Standings</a><a class="${active === 'bracket' ? 'active' : ''}" href="bracket.html">Bracket</a><a class="${active === 'teams' ? 'active' : ''}" href="teams.html">Teams</a><a class="admin-dot" title="Admin" href="admin.html">⚙</a></nav></div></header>`;
}

function init(active) {
  const name = escapeHtml(tournamentName());
  document.title = tournamentName();
  document.querySelectorAll('.top,.footer').forEach((el) => el.remove());
  document.body.insertAdjacentHTML('afterbegin', layout(active));
  document.body.insertAdjacentHTML('beforeend', `<footer class="footer"><div class="wrap">© ${new Date().getFullYear()} ${name}</div></footer>`);
}

function standings() {
  const { teams, matches } = data();
  const map = {};
  teams.forEach((t) => {
    map[t.name] = { team: t.name, group: t.group, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };
  });

  matches
    .filter((m) => m.round === 'Group Stage' && m.homeScore !== '' && m.awayScore !== '')
    .forEach((m) => {
      const h = map[m.home];
      const a = map[m.away];
      if (!h || !a) return;

      const hs = Number(m.homeScore);
      const as = Number(m.awayScore);
      if (!Number.isFinite(hs) || !Number.isFinite(as)) return;

      h.P++;
      a.P++;
      h.GF += hs;
      h.GA += as;
      a.GF += as;
      a.GA += hs;
      h.GD = h.GF - h.GA;
      a.GD = a.GF - a.GA;

      if (hs > as) {
        h.W++;
        a.L++;
        h.Pts += 3;
      } else if (hs < as) {
        a.W++;
        h.L++;
        a.Pts += 3;
      } else {
        h.D++;
        a.D++;
        h.Pts++;
        a.Pts++;
      }
    });

  return Object.values(map).sort((a, b) => a.group.localeCompare(b.group) || b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF);
}

function fixtureScheduleText(m) {
  const date = String(m.date || '').trim();
  const time = String(m.time || '').trim();
  const dateText = date && date !== 'TBA' ? date : 'TBA';
  const timeText = time && time !== 'TBA' ? time : '';
  return timeText ? `${dateText} • ${timeText}` : dateText;
}

function matchCard(m, editable = false) {
  const isPending = m.homeScore === '' || m.awayScore === '';
  const score = isPending ? 'vs' : `${m.homeScore} - ${m.awayScore}`;
  const scoreClass = isPending ? 'score vs-pill' : 'score score-result';

  return `<div class="match fixture-match"><div class="team-name team-home">${escapeHtml(m.home)}</div><div class="match-center"><div class="${scoreClass}">${escapeHtml(score)}</div><div class="match-date">${escapeHtml(fixtureScheduleText(m))}</div></div><div class="team-name team-away">${escapeHtml(m.away)}</div>${editable ? `<div class="match-edit"><button class="btn" onclick="editResult(${m.id})">Edit</button></div>` : ''}</div>`;
}

function renderHome() {
  applyResultDeadlineDefaults();
  init('home');
  const { teams, matches, settings } = data();
  const name = escapeHtml(tournamentName(settings));
  $('#app').innerHTML = `<section class="hero"><div class="wrap hero-grid"><div class="panel"><h1>${name}</h1><p>Fixtures, results, group standings and knockout bracket in one clean football website.</p><a class="btn" href="fixtures.html">View Fixtures</a> <a class="btn alt" href="standings.html">View Standings</a><div class="stats"><div class="stat"><b>${teams.length}</b><br><span>Teams</span></div><div class="stat"><b>${settings.groupCount}</b><br><span>Groups</span></div><div class="stat"><b>${settings.qualifyPerGroup}</b><br><span>Qualify / Group</span></div></div></div><div class="panel"><h2>Upcoming Fixtures</h2>${matches.slice(0, 4).map((m) => matchCard(m)).join('')}</div></div></section><section class="section"><div class="wrap"><div class="title"><h2>Latest Results</h2><a href="results.html">View all</a></div><div class="card">${matches.filter((m) => m.homeScore !== '' && m.awayScore !== '').slice(0, 5).map((m) => matchCard(m)).join('') || '<p class="small">No results yet.</p>'}</div></div></section>`;
}

function renderFixtures() {
  applyResultDeadlineDefaults();
  init('fixtures');
  const ms = data().matches.filter((m) => m.homeScore === '' || m.awayScore === '');
  const groups = [...new Set(ms.map((m) => m.group || m.round || 'Other'))]
    .sort((a, b) => GROUPS.indexOf(a) - GROUPS.indexOf(b));

  const groupedHtml = groups.map((g) => {
    const groupMatches = ms.filter((m) => (m.group || m.round || 'Other') === g);
    const title = GROUPS.includes(g) ? `Group ${escapeHtml(g)}` : escapeHtml(g);
    return `<h3 class="group-title">${title}</h3><div class="card">${groupMatches.map((m) => matchCard(m)).join('')}</div>`;
  }).join('');

  $('#app').innerHTML = `<section class="section"><div class="wrap"><div class="title"><h2>Fixtures</h2></div>${groupedHtml || '<div class="card">No upcoming fixtures.</div>'}</div></section>`;
}

function renderResults() {
  applyResultDeadlineDefaults();
  init('results');
  const d = data();
  const ms = d.matches.filter((m) => m.homeScore !== '' && m.awayScore !== '');
  const deadlineStatus = isResultDeadlinePassed(d.settings)
    ? `Result deadline passed: ${escapeHtml(resultDeadlineText(d.settings))}. Blank results are auto-recorded as 0-0 draws.`
    : `Result deadline: ${escapeHtml(resultDeadlineText(d.settings))}`;

  const groups = [...new Set(ms.map((m) => m.group || m.round || 'Other'))]
    .sort((a, b) => GROUPS.indexOf(a) - GROUPS.indexOf(b));

  const groupedHtml = groups.map((g) => {
    const groupMatches = ms.filter((m) => (m.group || m.round || 'Other') === g);
    const title = GROUPS.includes(g) ? `Group ${escapeHtml(g)}` : escapeHtml(g);
    return `<h3 class="group-title">${title}</h3><div class="card">${groupMatches.map((m) => matchCard(m)).join('')}</div>`;
  }).join('');

  $('#app').innerHTML = `<section class="section"><div class="wrap"><div class="title"><h2>Results</h2></div><p class="small">${deadlineStatus}</p>${groupedHtml || '<div class="card">No results yet.</div>'}</div></section>`;
}

function renderTeams() {
  init('teams');
  const { teams } = data();
  const groups = [...new Set(teams.map((t) => t.group))].sort();
  $('#app').innerHTML = `<section class="section"><div class="wrap"><h2>Teams</h2>${groups.map((g) => `<h3 class="group-title">Group ${escapeHtml(g)}</h3><div class="grid">${teams.filter((t) => t.group === g).map((t) => `<div class="card"><h3>${escapeHtml(t.name)}</h3><span class="tag">Group ${escapeHtml(t.group)}</span></div>`).join('')}</div>`).join('') || '<p>No teams yet.</p>'}</div></section>`;
}

function renderStandings() {
  applyResultDeadlineDefaults();
  init('standings');
  const rows = standings();
  const groups = [...new Set(rows.map((r) => r.group))];
  $('#app').innerHTML = `<section class="section"><div class="wrap"><h2>Group Standings</h2>${groups.map((g) => `<h3 class="group-title">Group ${escapeHtml(g)}</h3><table class="table standings-table"><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>${rows.filter((r) => r.group === g).map((r) => `<tr><td><b>${escapeHtml(r.team)}</b></td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF}</td><td>${r.GA}</td><td>${r.GD}</td><td><b>${r.Pts}</b></td></tr>`).join('')}</table>`).join('') || '<p>No standings yet.</p>'}</div></section>`;
}

function qualified() {
  const { settings } = data();
  const rows = standings();
  const out = [];
  GROUPS.slice(0, settings.groupCount).forEach((g) => {
    out.push(...rows.filter((r) => r.group === g).slice(0, settings.qualifyPerGroup).map((r) => r.team));
  });
  return out;
}

const KNOCKOUT_ROUNDS = ['Round of 32', 'Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'];

function roundIndex(round) {
  const idx = KNOCKOUT_ROUNDS.indexOf(round);
  return idx === -1 ? 999 : idx;
}

function isPowerOfTwo(n) {
  return n >= 2 && (n & (n - 1)) === 0;
}

function firstKnockoutRoundName(teamCount) {
  if (teamCount === 32) return 'Round of 32';
  if (teamCount === 16) return 'Round of 16';
  if (teamCount === 8) return 'Quarter Finals';
  if (teamCount === 4) return 'Semi Finals';
  if (teamCount === 2) return 'Final';
  return '';
}

function pairKnockoutTeams(teams) {
  const pairs = [];
  for (let i = 0; i < teams.length / 2; i += 1) {
    pairs.push([teams[i], teams[teams.length - 1 - i]]);
  }
  return pairs;
}

function buildKnockoutRound(teams, round) {
  return pairKnockoutTeams(teams).map(([home, away], i) => ({
    id: Date.now() + i,
    round,
    group: '',
    home,
    away,
    homeScore: '',
    awayScore: '',
    date: '',
    time: ''
  }));
}

function knockoutWinner(match) {
  if (match.homeScore === '' || match.awayScore === '') return '';
  const hs = Number(match.homeScore);
  const as = Number(match.awayScore);
  if (!Number.isFinite(hs) || !Number.isFinite(as)) return '';
  if (hs === as) return '';
  return hs > as ? match.home : match.away;
}

function isKnockoutPendingZero(match) {
  if (!match || match.round === 'Group Stage') return false;
  const hs = String(match.homeScore ?? '').trim();
  const as = String(match.awayScore ?? '').trim();

  // In knockout rounds, 0-0 has no winner. Treat generated 0-0 as pending,
  // unless it was intentionally created by the deadline auto-draw rule.
  return hs === '0' && as === '0' && !match.autoDrawApplied && !knockoutWinner(match);
}

function knockoutDisplayMatchCard(m) {
  if (!isKnockoutPendingZero(m)) return matchCard(m);

  return `<div class="match fixture-match"><div class="team-name team-home">${escapeHtml(m.home)}</div><div class="match-center"><div class="score vs-pill">vs</div><div class="match-date">${escapeHtml(fixtureScheduleText(m))}</div></div><div class="team-name team-away">${escapeHtml(m.away)}</div></div>`;
}

function knockoutInputValue(match, side) {
  if (isKnockoutPendingZero(match)) return '';
  return side === 'home' ? match.homeScore : match.awayScore;
}

function nextKnockoutRoundName(round) {
  const idx = KNOCKOUT_ROUNDS.indexOf(round);
  if (idx === -1 || idx >= KNOCKOUT_ROUNDS.length - 1) return '';
  return KNOCKOUT_ROUNDS[idx + 1];
}

function latestKnockoutRound(matches) {
  const rounds = [...new Set(matches.filter((m) => m.round !== 'Group Stage').map((m) => m.round))]
    .sort((a, b) => roundIndex(a) - roundIndex(b));
  return rounds[rounds.length - 1] || '';
}

function knockoutRoundListFromMatches(matches) {
  const used = [...new Set(matches.filter((m) => m.round !== 'Group Stage').map((m) => m.round))];
  return KNOCKOUT_ROUNDS.filter((r) => used.includes(r));
}


function renderBracket() {
  applyResultDeadlineDefaults();
  init('bracket');
  const d = data();
  const q = qualified();
  const kos = d.matches.filter((m) => m.round !== 'Group Stage');
  const rounds = knockoutRoundListFromMatches(d.matches);

  const bracketHtml = rounds.map((round) => {
    const ms = kos.filter((m) => m.round === round);
    return `<h3 class="group-title">${escapeHtml(round)}</h3><div class="card">${ms.map((m) => knockoutDisplayMatchCard(m)).join('')}</div>`;
  }).join('');

  $('#app').innerHTML = `<section class="section"><div class="wrap"><h2>Knockout Bracket</h2><p class="small">Generate knockout fixtures from Admin after the group stage is completed.</p>${bracketHtml || `<div class="card"><h3>Qualified Teams</h3>${q.map((t) => `<div class="slot">${escapeHtml(t)}</div>`).join('') || '<p class="small">No qualified teams yet.</p>'}<p class="small">No knockout fixtures generated yet.</p></div>`}</div></section>`;
}

function renderAdmin() {
  applyResultDeadlineDefaults();
  init('');
  const logged = sessionStorage.getItem('efl_admin') === 'yes';
  $('#app').innerHTML = logged ? adminDash() : loginBox();
  bindAdmin();
}

function loginBox() {
  const settings = data().settings;
  if (!settings.adminPin) {
    return `<section class="section"><div class="wrap"><div class="panel" style="max-width:420px;margin:auto"><h2>Create Admin PIN</h2><p class="small">No default PIN is shown or used. Create your private admin PIN before managing the tournament.</p><div class="form"><input id="newPin" type="password" placeholder="New admin PIN"><input id="confirmPin" type="password" placeholder="Confirm admin PIN"><button class="btn" id="createPinBtn">Create PIN</button></div></div></div></section>`;
  }

  return `<section class="section"><div class="wrap"><div class="panel" style="max-width:420px;margin:auto"><h2>Admin Login</h2><div class="form"><input id="pin" type="password" placeholder="Admin PIN"><button class="btn" id="loginBtn">Login</button></div></div></div></section>`;
}

function adminDash() {
  return `<section class="section"><div class="wrap admin-layout"><div class="side panel"><button data-tab="settings" class="active">Tournament Settings</button><button data-tab="teams">Bulk Teams + Groups</button><button data-tab="fixtures">Fixtures</button><button data-tab="results">Fast Result Entry</button><button data-tab="knockout">Knockout Fixtures</button><button onclick="sessionStorage.removeItem('efl_admin');location.reload()">Logout</button></div><div class="panel"><div id="adminContent"></div></div></div></section>`;
}

function bindAdmin() {
  const createPinBtn = $('#createPinBtn');
  if (createPinBtn) {
    createPinBtn.onclick = () => {
      const newPin = ($('#newPin')?.value || '').trim();
      const confirmPin = ($('#confirmPin')?.value || '').trim();

      if (newPin.length < 4) return alert('PIN must be at least 4 characters.');
      if (newPin !== confirmPin) return alert('PINs do not match.');

      const s = data().settings;
      s.adminPin = newPin;
      setData({ settings: s });
      sessionStorage.setItem('efl_admin', 'yes');
      location.reload();
    };
  }

  const lb = $('#loginBtn');
  if (lb) {
    lb.onclick = () => {
      if ($('#pin').value === data().settings.adminPin) {
        sessionStorage.setItem('efl_admin', 'yes');
        location.reload();
      } else {
        alert('Wrong PIN');
      }
    };
  }

  if ($('#adminContent')) {
    showAdminTab('settings');
    $$('.side button[data-tab]').forEach((b) => {
      b.onclick = () => {
        $$('.side button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        showAdminTab(b.dataset.tab);
      };
    });
  }
}

function adminMessage(text, type = 'ok') {
  const box = $('#adminMessage');
  if (box) box.innerHTML = `<div class="notice ${type}">${escapeHtml(text)}</div>`;
}

function groupOptions(selected, groupCount) {
  return GROUPS.slice(0, groupCount).map((g) => `<option ${selected === g ? 'selected' : ''}>${g}</option>`).join('');
}

function showAdminTab(tab) {
  const { settings, teams, matches } = data();
  const c = $('#adminContent');

  if (tab === 'settings') {
    c.innerHTML = `<h2>Tournament Settings</h2><div id="adminMessage"></div><div class="form"><label>Tournament name <input id="tournamentName" value="${escapeHtml(tournamentName(settings))}" placeholder="Example: Elite Football League"></label><label>Number of groups <input id="groupCount" type="number" min="1" max="12" value="${settings.groupCount}"></label><label>Teams per group <input id="teamsPerGroup" type="number" min="2" max="8" value="${settings.teamsPerGroup}"></label><label>Teams qualify per group <input id="qualifyPerGroup" type="number" min="1" max="8" value="${settings.qualifyPerGroup}"></label><label>Admin PIN <input id="adminPin" type="password" value="${escapeHtml(settings.adminPin)}" placeholder="Set admin PIN"></label><button class="btn" onclick="saveSettings()">Save Settings</button></div>`;
  }

  if (tab === 'teams') {
    const groupedSummary = GROUPS.slice(0, settings.groupCount)
      .map((g) => `${g}: ${teams.filter((t) => t.group === g).length}`)
      .join(' • ');

    c.innerHTML = `<h2>Bulk Teams + Auto Group Shuffle</h2><div id="adminMessage"></div><div class="admin-tools"><div class="tool-card"><h3>Paste teams at once</h3><p class="small">Paste one team per line. Commas also work. The system will shuffle and assign teams evenly into groups.</p><textarea id="bulkTeams" rows="10" placeholder="Example:\nFalcon FC\nRoyal Lions\nGolden Tigers\nUnited Stars"></textarea><div class="check-row"><label><input id="replaceTeams" type="checkbox" checked> Replace current teams</label><label><input id="autoFixtures" type="checkbox" checked> Generate group fixtures after grouping</label></div><button class="btn" onclick="bulkCreateTeams()">Create Groups Automatically</button><button class="btn alt" onclick="shuffleExistingTeams()">Shuffle Existing Teams</button></div><div class="tool-card"><h3>Single team add</h3><div class="form compact"><input id="teamName" placeholder="Team name"><select id="teamGroup">${groupOptions('A', settings.groupCount)}</select><button class="btn" onclick="addTeam()">Add Team</button></div><hr><p class="small"><b>Current:</b> ${teams.length}/${settings.teamLimit} teams</p><p class="small"><b>Groups:</b> ${escapeHtml(groupedSummary || 'No teams yet')}</p><button class="btn danger" onclick="clearTeamsAndMatches()">Clear Teams + Fixtures</button></div></div><br><h3>Team List</h3><div class="table-scroll"><table class="table"><tr><th>Team</th><th>Group</th><th>Action</th></tr>${teams.map((t) => `<tr><td><input value="${escapeHtml(t.name)}" onchange="updateTeam(${t.id},'name',this.value)"></td><td><select onchange="updateTeam(${t.id},'group',this.value)">${groupOptions(t.group, settings.groupCount)}</select></td><td><button onclick="deleteTeam(${t.id})">Delete</button></td></tr>`).join('') || '<tr><td colspan="3">No teams yet.</td></tr>'}</table></div>`;
  }

  if (tab === 'fixtures') {
    const fixtureGroups = [...new Set(matches.map((m) => m.group || m.round || 'Other'))]
      .sort((a, b) => GROUPS.indexOf(a) - GROUPS.indexOf(b));

    const fixtureTables = fixtureGroups.map((g) => {
      const title = GROUPS.includes(g) ? `Group ${escapeHtml(g)}` : escapeHtml(g);
      const rows = matches.filter((m) => (m.group || m.round || 'Other') === g).map((m) => `<tr><td><b>${escapeHtml(m.home)}</b><br><span class="small">vs ${escapeHtml(m.away)}</span></td><td><input id="date_${m.id}" type="date" value="${escapeHtml((m.date && m.date !== 'TBA') ? m.date : '')}"></td><td><input id="time_${m.id}" type="time" value="${escapeHtml((m.time && m.time !== 'TBA') ? m.time : '')}"></td></tr>`).join('');

      return `<h3 class="group-title">${title}</h3><div class="table-scroll"><table class="table"><tr><th>Match</th><th>Date</th><th>Time</th></tr>${rows}</table></div>`;
    }).join('');

    c.innerHTML = `<h2>Fixtures + Optional Schedule</h2><div id="adminMessage"></div><div class="admin-actions"><button class="btn" onclick="generateFixtures()">Generate Group Fixtures</button><button class="btn alt" onclick="clearFixtureSchedule()">Clear Date/Time Only</button><button class="btn danger" onclick="clearFixtures()">Clear Fixtures</button></div><p class="small">Date and time are optional. Leave them blank if the fixture schedule is not confirmed yet.</p><div class="tool-card"><h3>Quick schedule apply</h3><p class="small">Optional shortcut: apply the same date/time to all fixtures, then adjust individual matches below.</p><div class="form compact"><input id="bulkFixtureDate" type="date"><input id="bulkFixtureTime" type="time"><button class="btn" onclick="applyBulkFixtureSchedule()">Apply to All Fixtures</button></div></div><br>${fixtureTables || '<div class="card">No fixtures yet. Generate fixtures first.</div>'}<div class="admin-actions"><button class="btn" onclick="saveFixtureSchedule()">Save Fixture Date/Time</button></div>`;
  }

  if (tab === 'results') {
    const deadlinePassed = isResultDeadlinePassed(settings);
    const deadlineStatus = deadlinePassed
      ? `Deadline passed: ${escapeHtml(resultDeadlineText(settings))}. Blank results will become 0-0.`
      : `Deadline: ${escapeHtml(resultDeadlineText(settings))}`;

    c.innerHTML = `<h2>Fast Result Entry</h2><div id="adminMessage"></div><div class="tool-card"><h3>Result filling deadline</h3><p class="small">Optional. After this date and time, any match without a result will automatically become a 0-0 draw. Admin can still edit the result later.</p><div class="form compact"><input id="resultDeadlineDate" type="date" value="${escapeHtml(settings.resultDeadlineDate || '')}"><input id="resultDeadlineTime" type="time" value="${escapeHtml(settings.resultDeadlineTime || '')}"><button class="btn" onclick="saveResultDeadline()">Save Deadline</button><button class="btn alt" onclick="applyDeadlineDrawsNow()">Apply 0-0 Now</button></div><p class="small">${deadlineStatus}</p></div><br><p class="small">Enter all scores on one screen, then click Save All Results. Leave both score boxes blank if the match has not been played yet.</p><div class="table-scroll"><table class="table result-table"><tr><th>Group/Round</th><th>Match</th><th>Home</th><th>Away</th><th>Status</th></tr>${matches.map((m) => `<tr><td>${escapeHtml(m.group || m.round)}</td><td><b>${escapeHtml(m.home)}</b><br><span class="small">vs ${escapeHtml(m.away)}</span></td><td><input class="score-input" id="hs_${m.id}" type="number" min="0" inputmode="numeric" value="${escapeHtml(m.homeScore)}"></td><td><input class="score-input" id="as_${m.id}" type="number" min="0" inputmode="numeric" value="${escapeHtml(m.awayScore)}"></td><td>${m.autoDrawApplied ? '<span class="tag">Auto 0-0</span>' : '<span class="small">Manual / pending</span>'}</td></tr>`).join('') || '<tr><td colspan="5">No matches yet. Generate fixtures first.</td></tr>'}</table></div><div class="admin-actions"><button class="btn" onclick="saveAllResults()">Save All Results</button><button class="btn alt" onclick="clearAllScores()">Clear All Scores</button></div>`;
  }

  if (tab === 'knockout') {
    const q = qualified();
    const kos = matches.filter((m) => m.round !== 'Group Stage');

    const roundsForDeadline = KNOCKOUT_ROUNDS.filter((round) => {
      if (round === 'Round of 32') return q.length === 32 || kos.some((m) => m.round === round);
      if (round === 'Round of 16') return q.length >= 16 || kos.some((m) => m.round === round);
      return kos.some((m) => m.round === round) || ['Quarter Finals', 'Semi Finals', 'Final'].includes(round);
    });

    const deadlineRows = roundsForDeadline.map((round, i) => {
      const saved = (settings.knockoutDeadlines || {})[round] || {};
      return `<tr><td><b>${escapeHtml(round)}</b><br><span class="small">${escapeHtml(knockoutDeadlineText(settings, round))}</span></td><td><input id="koDeadlineDate_${i}" type="date" value="${escapeHtml(saved.date || '')}"></td><td><input id="koDeadlineTime_${i}" type="time" value="${escapeHtml(saved.time || '')}"></td></tr>`;
    }).join('');

    const scheduleRows = kos.map((m) => `<tr><td>${escapeHtml(m.round)}</td><td><b>${escapeHtml(m.home)}</b><br><span class="small">vs ${escapeHtml(m.away)}</span></td><td><input id="koDate_${m.id}" type="date" value="${escapeHtml((m.date && m.date !== 'TBA') ? m.date : '')}"></td><td><input id="koTime_${m.id}" type="time" value="${escapeHtml((m.time && m.time !== 'TBA') ? m.time : '')}"></td></tr>`).join('');

    const resultRows = kos.map((m) => `<tr><td>${escapeHtml(m.round)}</td><td><b>${escapeHtml(m.home)}</b><br><span class="small">vs ${escapeHtml(m.away)}</span></td><td><input class="score-input" id="koHs_${m.id}" type="number" min="0" inputmode="numeric" value="${escapeHtml(knockoutInputValue(m, 'home'))}"></td><td><input class="score-input" id="koAs_${m.id}" type="number" min="0" inputmode="numeric" value="${escapeHtml(knockoutInputValue(m, 'away'))}"></td><td>${knockoutWinner(m) ? `<span class="tag">Winner: ${escapeHtml(knockoutWinner(m))}</span>` : '<span class="small">Pending</span>'}</td></tr>`).join('');

    c.innerHTML = `<h2>Knockout Fixtures</h2><div id="adminMessage"></div><div class="tool-card"><h3>Qualified teams</h3><p class="small">${q.length} team(s) qualified from group standings.</p><div class="card">${q.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(' ') || '<p class="small">No qualified teams yet.</p>'}</div><div class="admin-actions"><button class="btn" onclick="generateFirstKnockoutRound()">Generate First Knockout Round</button><button class="btn alt" onclick="generateNextKnockoutRound()">Generate Next Round</button><button class="btn danger" onclick="clearKnockoutFixtures()">Clear Knockout Fixtures</button></div></div><br><div class="tool-card"><h3>Knockout deadlines</h3><p class="small">Set deadline date/time for each knockout round. Blank knockout results become 0-0 after that round deadline passes.</p><div class="table-scroll"><table class="table"><tr><th>Round</th><th>Deadline Date</th><th>Deadline Time</th></tr>${deadlineRows}</table></div><div class="admin-actions"><button class="btn" onclick="saveKnockoutDeadlines()">Save Knockout Deadlines</button><button class="btn alt" onclick="applyDeadlineDrawsNow()">Apply Due 0-0 Now</button></div></div><br><div class="tool-card"><h3>Knockout date/time</h3><p class="small">Optional fixture schedule for knockout matches.</p><div class="table-scroll"><table class="table"><tr><th>Round</th><th>Match</th><th>Date</th><th>Time</th></tr>${scheduleRows || '<tr><td colspan="4">No knockout fixtures yet.</td></tr>'}</table></div><div class="admin-actions"><button class="btn" onclick="saveKnockoutSchedule()">Save Knockout Date/Time</button></div></div><br><div class="tool-card"><h3>Knockout results</h3><div class="table-scroll"><table class="table"><tr><th>Round</th><th>Match</th><th>Home</th><th>Away</th><th>Status</th></tr>${resultRows || '<tr><td colspan="5">No knockout fixtures yet.</td></tr>'}</table></div><div class="admin-actions"><button class="btn" onclick="saveKnockoutResults()">Save Knockout Results</button></div></div>`;
  }

}

function parseTeamNames(raw) {
  const names = String(raw || '')
    .split(/\n|,|;/)
    .map((name) => name.trim())
    .filter(Boolean);

  const seen = new Set();
  return names.filter((name) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shuffleArray(input) {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createGroupedTeamsFromNames(names, settings, preserveIds = false, existingTeams = []) {
  const shuffled = shuffleArray(names);
  const currentByName = new Map(existingTeams.map((t) => [t.name.toLowerCase(), t.id]));
  const groupCount = Math.max(1, Math.min(settings.groupCount, GROUPS.length));

  return shuffled.map((name, index) => ({
    id: preserveIds && currentByName.has(name.toLowerCase()) ? currentByName.get(name.toLowerCase()) : Date.now() + index,
    name,
    group: GROUPS[index % groupCount]
  }));
}


window.generateFirstKnockoutRound = () => {
  const d = data();
  const q = qualified();

  if (!isPowerOfTwo(q.length)) {
    return adminMessage(`Qualified team count is ${q.length}. Use 2, 4, 8, 16, or 32 teams for automatic knockout generation.`, 'bad');
  }

  const round = firstKnockoutRoundName(q.length);
  if (!round) return adminMessage('Cannot decide knockout round from qualified team count.', 'bad');

  const existingKnockout = d.matches.some((m) => m.round !== 'Group Stage');
  if (existingKnockout && !confirm('Existing knockout fixtures will be replaced. Continue?')) return;

  const groupMatches = d.matches.filter((m) => m.round === 'Group Stage');
  const firstRound = buildKnockoutRound(q, round);
  setData({ matches: [...groupMatches, ...firstRound] });
  showAdminTab('knockout');
  adminMessage(`${round} generated with ${firstRound.length} match(es).`, 'ok');
};

window.generateNextKnockoutRound = () => {
  const d = data();
  const kos = d.matches.filter((m) => m.round !== 'Group Stage');
  if (!kos.length) return adminMessage('Generate first knockout round first.', 'bad');

  const currentRound = latestKnockoutRound(d.matches);
  const nextRound = nextKnockoutRoundName(currentRound);
  if (!nextRound) return adminMessage('No next round available.', 'bad');

  const currentMatches = kos.filter((m) => m.round === currentRound);
  const winners = currentMatches.map((m) => knockoutWinner(m));

  if (winners.some((w) => !w)) {
    return adminMessage(`Complete all ${currentRound} results first. Draws cannot advance automatically.`, 'bad');
  }

  if (d.matches.some((m) => m.round === nextRound) && !confirm(`${nextRound} already exists. Replace it and later rounds?`)) return;

  const keepRounds = d.matches.filter((m) => m.round === 'Group Stage' || roundIndex(m.round) <= roundIndex(currentRound));
  const nextMatches = buildKnockoutRound(winners, nextRound);
  setData({ matches: [...keepRounds, ...nextMatches] });
  showAdminTab('knockout');
  adminMessage(`${nextRound} generated.`, 'ok');
};

window.clearKnockoutFixtures = () => {
  if (!confirm('Clear all knockout fixtures, results, and schedules? Group stage stays.')) return;
  const d = data();
  d.matches = d.matches.filter((m) => m.round === 'Group Stage');
  setData({ matches: d.matches });
  showAdminTab('knockout');
  adminMessage('Knockout fixtures cleared.', 'ok');
};

window.saveKnockoutDeadlines = () => {
  const d = data();
  const q = qualified();

  const rounds = KNOCKOUT_ROUNDS.filter((round) => {
    if (round === 'Round of 32') return q.length === 32 || d.matches.some((m) => m.round === round);
    if (round === 'Round of 16') return q.length >= 16 || d.matches.some((m) => m.round === round);
    return d.matches.some((m) => m.round === round) || ['Quarter Finals', 'Semi Finals', 'Final'].includes(round);
  });

  const deadlines = { ...(d.settings.knockoutDeadlines || {}) };

  for (let i = 0; i < rounds.length; i += 1) {
    const round = rounds[i];
    const date = ($(`#koDeadlineDate_${i}`)?.value || '').trim();
    const time = ($(`#koDeadlineTime_${i}`)?.value || '').trim();

    if ((date && !time) || (!date && time)) {
      return adminMessage(`Set both date and time for ${round}, or leave both blank.`, 'bad');
    }

    if (date && time) deadlines[round] = { date, time };
    if (!date && !time) delete deadlines[round];
  }

  d.settings.knockoutDeadlines = deadlines;
  setData({ settings: d.settings });

  const changed = applyResultDeadlineDefaults();
  showAdminTab('knockout');
  adminMessage(changed > 0 ? `Deadlines saved. ${changed} due blank result(s) became 0-0.` : 'Knockout deadlines saved.', 'ok');
};

window.saveKnockoutSchedule = () => {
  const d = data();
  d.matches = d.matches.map((m) => {
    if (m.round === 'Group Stage') return m;
    return { ...m, date: $(`#koDate_${m.id}`)?.value || '', time: $(`#koTime_${m.id}`)?.value || '' };
  });
  setData({ matches: d.matches });
  showAdminTab('knockout');
  adminMessage('Knockout date/time saved.', 'ok');
};

window.saveKnockoutResults = () => {
  const d = data();
  const invalid = [];

  d.matches = d.matches.map((m) => {
    if (m.round === 'Group Stage') return m;

    const hs = $(`#koHs_${m.id}`)?.value.trim() ?? m.homeScore;
    const as = $(`#koAs_${m.id}`)?.value.trim() ?? m.awayScore;

    if ((hs === '' && as !== '') || (hs !== '' && as === '')) {
      invalid.push(`${m.home} vs ${m.away}`);
      return m;
    }

    return { ...m, homeScore: hs, awayScore: as, autoDrawApplied: false, autoDrawAppliedAt: '' };
  });

  if (invalid.length) return adminMessage(`Some knockout matches have only one score filled: ${invalid.slice(0, 3).join(', ')}`, 'bad');

  setData({ matches: d.matches });
  showAdminTab('knockout');
  adminMessage('Knockout results saved.', 'ok');
};


window.saveSettings = () => {
  const s = data().settings;
  s.tournamentName = ($('#tournamentName')?.value || '').trim() || defaults.settings.tournamentName;
  s.groupCount = Math.max(1, Math.min(12, Number($('#groupCount').value) || 1));
  s.teamsPerGroup = Math.max(2, Math.min(8, Number($('#teamsPerGroup').value) || 4));
  s.qualifyPerGroup = Math.max(1, Math.min(8, Number($('#qualifyPerGroup').value) || 2));
  const newAdminPin = ($('#adminPin')?.value || '').trim();
  if (newAdminPin.length < 4) {
    return adminMessage('Admin PIN must be at least 4 characters. No default PIN is used.', 'bad');
  }
  s.adminPin = newAdminPin;
  setData({ settings: s });
  adminMessage('Settings saved. Your admin PIN is private and no default PIN is displayed.', 'ok');
};

window.addTeam = () => {
  const d = data();
  if (d.teams.length >= d.settings.teamLimit) return alert('Maximum 48 teams');
  const name = $('#teamName').value.trim();
  if (!name) return;
  if (d.teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) return alert('This team already exists.');
  d.teams.push({ id: Date.now(), name, group: $('#teamGroup').value });
  setData({ teams: d.teams });
  showAdminTab('teams');
};

window.updateTeam = (id, k, v) => {
  const d = data();
  d.teams = d.teams.map((t) => (t.id === id ? { ...t, [k]: v } : t));
  setData({ teams: d.teams });
};

window.deleteTeam = (id) => {
  const d = data();
  d.teams = d.teams.filter((t) => t.id !== id);
  d.matches = d.matches.filter((m) => d.teams.some((t) => t.name === m.home) && d.teams.some((t) => t.name === m.away));
  setData({ teams: d.teams, matches: d.matches });
  showAdminTab('teams');
};

window.bulkCreateTeams = () => {
  const d = data();
  const pasted = parseTeamNames($('#bulkTeams').value);
  const replace = $('#replaceTeams').checked;
  const autoFixtures = $('#autoFixtures').checked;

  if (pasted.length === 0) return adminMessage('Paste team names first.', 'bad');
  if (pasted.length > d.settings.teamLimit) return adminMessage(`You pasted ${pasted.length} teams. Maximum is ${d.settings.teamLimit}.`, 'bad');

  const capacity = d.settings.groupCount * d.settings.teamsPerGroup;
  if (pasted.length > capacity) {
    return adminMessage(`You pasted ${pasted.length} teams, but your current capacity is ${capacity}. Increase groups or teams per group in settings first.`, 'bad');
  }

  const names = replace ? pasted : parseTeamNames([...d.teams.map((t) => t.name), ...pasted].join('\n'));
  const teams = createGroupedTeamsFromNames(names, d.settings, false, d.teams);
  const newData = { teams };

  if (autoFixtures) {
    newData.matches = buildGroupFixtures(teams, d.settings);
  } else if (replace) {
    newData.matches = [];
  }

  setData(newData);
  showAdminTab('teams');
  adminMessage(`${teams.length} teams created and shuffled into ${d.settings.groupCount} groups.`, 'ok');
};

window.shuffleExistingTeams = () => {
  const d = data();
  if (d.teams.length < 2) return adminMessage('Add at least 2 teams before shuffling.', 'bad');

  const capacity = d.settings.groupCount * d.settings.teamsPerGroup;
  if (d.teams.length > capacity) {
    return adminMessage(`You have ${d.teams.length} teams, but capacity is ${capacity}. Increase groups or teams per group in settings first.`, 'bad');
  }

  const teams = createGroupedTeamsFromNames(d.teams.map((t) => t.name), d.settings, true, d.teams);
  const matches = buildGroupFixtures(teams, d.settings);
  setData({ teams, matches });
  showAdminTab('teams');
  adminMessage('Existing teams were shuffled and group fixtures were regenerated.', 'ok');
};

window.clearTeamsAndMatches = () => {
  if (!confirm('Clear all teams, fixtures, and results?')) return;
  setData({ teams: [], matches: [] });
  showAdminTab('teams');
  adminMessage('Teams and fixtures cleared.', 'ok');
};

function buildGroupFixtures(teams, settings) {
  const ms = [];
  GROUPS.slice(0, settings.groupCount).forEach((g) => {
    const arr = teams.filter((t) => t.group === g);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        ms.push({
          id: Date.now() + ms.length,
          round: 'Group Stage',
          group: g,
          home: arr[i].name,
          away: arr[j].name,
          homeScore: '',
          awayScore: '',
          date: '',
          time: ''
        });
      }
    }
  });
  return ms;
}

window.generateFixtures = () => {
  const d = data();
  const ms = buildGroupFixtures(d.teams, d.settings);
  setData({ matches: ms });
  showAdminTab('fixtures');
  adminMessage(`${ms.length} group fixtures generated.`, 'ok');
};

window.clearFixtures = () => {
  if (!confirm('Clear all fixtures and results?')) return;
  setData({ matches: [] });
  showAdminTab('fixtures');
  adminMessage('Fixtures cleared.', 'ok');
};

window.saveFixtureSchedule = () => {
  const d = data();
  d.matches = d.matches.map((m) => {
    const date = $(`#date_${m.id}`)?.value || '';
    const time = $(`#time_${m.id}`)?.value || '';
    return { ...m, date, time };
  });
  setData({ matches: d.matches });
  showAdminTab('fixtures');
  adminMessage('Fixture date/time saved successfully.', 'ok');
};

window.applyBulkFixtureSchedule = () => {
  const date = $('#bulkFixtureDate')?.value || '';
  const time = $('#bulkFixtureTime')?.value || '';
  if (!date && !time) return adminMessage('Choose a date, time, or both first.', 'bad');

  const d = data();
  d.matches = d.matches.map((m) => ({
    ...m,
    date: date || m.date || '',
    time: time || m.time || ''
  }));
  setData({ matches: d.matches });
  showAdminTab('fixtures');
  adminMessage('Date/time applied to all fixtures. You can still edit individual fixtures.', 'ok');
};

window.clearFixtureSchedule = () => {
  if (!confirm('Clear date and time from all fixtures? Scores and matches will stay.')) return;
  const d = data();
  d.matches = d.matches.map((m) => ({ ...m, date: '', time: '' }));
  setData({ matches: d.matches });
  showAdminTab('fixtures');
  adminMessage('Fixture date/time cleared. Fixtures and scores were kept.', 'ok');
};

window.editResult = (id) => {
  const d = data();
  const m = d.matches.find((x) => x.id === id);
  const hs = prompt(`${m.home} score`, m.homeScore);
  if (hs === null) return;
  const as = prompt(`${m.away} score`, m.awayScore);
  if (as === null) return;
  m.homeScore = hs;
  m.awayScore = as;
  setData({ matches: d.matches });
  showAdminTab('results');
};

window.saveResultDeadline = () => {
  const d = data();
  const date = ($('#resultDeadlineDate')?.value || '').trim();
  const time = ($('#resultDeadlineTime')?.value || '').trim();

  if ((date && !time) || (!date && time)) {
    return adminMessage('Please set both deadline date and deadline time, or leave both blank.', 'bad');
  }

  d.settings.resultDeadlineDate = date;
  d.settings.resultDeadlineTime = time;
  setData({ settings: d.settings });

  const changed = applyResultDeadlineDefaults();
  showAdminTab('results');

  if (changed > 0) {
    adminMessage(`Deadline saved. ${changed} blank match result(s) were auto-recorded as 0-0 draws.`, 'ok');
  } else {
    adminMessage('Result deadline saved successfully.', 'ok');
  }
};

window.applyDeadlineDrawsNow = () => {
  const changed = applyResultDeadlineDefaults();
  if (changed > 0) {
    adminMessage(`${changed} due blank match result(s) were auto-recorded as 0-0. Admin can still edit them later.`, 'ok');
  } else {
    adminMessage('No due blank results found. Check group or knockout deadlines.', 'ok');
  }
};

window.saveAllResults = () => {
  const d = data();
  const invalid = [];

  d.matches = d.matches.map((m) => {
    const hs = $(`#hs_${m.id}`)?.value.trim() ?? '';
    const as = $(`#as_${m.id}`)?.value.trim() ?? '';

    if ((hs === '' && as !== '') || (hs !== '' && as === '')) {
      invalid.push(`${m.home} vs ${m.away}`);
      return m;
    }

    return { ...m, homeScore: hs, awayScore: as, autoDrawApplied: false, autoDrawAppliedAt: '' };
  });

  if (invalid.length) {
    return adminMessage(`Some matches have only one score filled: ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '...' : ''}`, 'bad');
  }

  setData({ matches: d.matches });
  showAdminTab('results');
  adminMessage('All results saved successfully.', 'ok');
};

window.clearAllScores = () => {
  if (!confirm('Clear all scores but keep fixtures?')) return;
  const d = data();
  d.matches = d.matches.map((m) => ({ ...m, homeScore: '', awayScore: '', autoDrawApplied: false, autoDrawAppliedAt: '' }));
  setData({ matches: d.matches });
  showAdminTab('results');
  adminMessage('All scores cleared.', 'ok');
};


/* =========================================================
   UCL NEW FORMAT + TOP SCORING TEAM + BEST OF 2 UPGRADE
   Added by ChatGPT for EFL UCL tournament.
   ========================================================= */

// Upgrade defaults without deleting existing saved browser data.
defaults.settings = {
  ...defaults.settings,
  tournamentName: defaults.settings.tournamentName || 'EFL Champions League',
  tournamentMode: 'ucl_new',
  teamLimit: 24,
  leaguePhaseMatchesPerTeam: 4,
  groupCount: 1,
  qualifyPerGroup: 24,
  teamsPerGroup: 24,
  knockoutDeadlines: defaults.settings.knockoutDeadlines || {},
};

const UCL_KO_ROUNDS = ['Knockout Playoff', 'Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'];

function isUclNewFormat(settings = data().settings) {
  return (settings.tournamentMode || 'ucl_new') === 'ucl_new';
}

function isLeaguePhaseMatch(m) {
  return m.round === 'League Phase' || m.round === 'Group Stage';
}

function isKnockoutMatch(m) {
  return !isLeaguePhaseMatch(m);
}

function hasNumericScore(m) {
  if (!m) return false;
  if (m.homeScore === '' || m.awayScore === '') return false;
  const hs = Number(m.homeScore);
  const as = Number(m.awayScore);
  return Number.isFinite(hs) && Number.isFinite(as);
}

function teamInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'T';
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function rankLabel(index) {
  const rank = index + 1;
  if (isUclNewFormat()) {
    if (rank <= 8) return '<span class="tag ucl-direct">Round of 16</span>';
    if (rank <= 24) return '<span class="tag ucl-playoff">Playoff</span>';
  }
  return '';
}

function roundIndex(round) {
  const idx = UCL_KO_ROUNDS.indexOf(round);
  return idx === -1 ? 999 : idx;
}

function nextKnockoutRoundName(round) {
  const idx = UCL_KO_ROUNDS.indexOf(round);
  if (idx === -1 || idx >= UCL_KO_ROUNDS.length - 1) return '';
  return UCL_KO_ROUNDS[idx + 1];
}

function latestKnockoutRound(matches) {
  const rounds = [...new Set(matches.filter((m) => isKnockoutMatch(m)).map((m) => m.round))]
    .sort((a, b) => roundIndex(a) - roundIndex(b));
  return rounds[rounds.length - 1] || '';
}

function knockoutRoundListFromMatches(matches) {
  const used = [...new Set(matches.filter((m) => isKnockoutMatch(m)).map((m) => m.round))];
  return UCL_KO_ROUNDS.filter((r) => used.includes(r));
}

function standings() {
  const { teams, matches, settings } = data();
  const map = {};

  teams.forEach((t) => {
    map[t.name] = { team: t.name, group: isUclNewFormat(settings) ? 'League Phase' : (t.group || 'A'), P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };
  });

  matches
    .filter((m) => isLeaguePhaseMatch(m) && hasNumericScore(m))
    .forEach((m) => {
      const h = map[m.home];
      const a = map[m.away];
      if (!h || !a) return;

      const hs = Number(m.homeScore);
      const as = Number(m.awayScore);

      h.P += 1;
      a.P += 1;
      h.GF += hs;
      h.GA += as;
      a.GF += as;
      a.GA += hs;
      h.GD = h.GF - h.GA;
      a.GD = a.GF - a.GA;

      if (hs > as) {
        h.W += 1;
        a.L += 1;
        h.Pts += 3;
      } else if (hs < as) {
        a.W += 1;
        h.L += 1;
        a.Pts += 3;
      } else {
        h.D += 1;
        a.D += 1;
        h.Pts += 1;
        a.Pts += 1;
      }
    });

  return Object.values(map).sort((a, b) => {
    if (!isUclNewFormat(settings)) return a.group.localeCompare(b.group) || b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || a.team.localeCompare(b.team);
    return b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || a.team.localeCompare(b.team);
  });
}

function topScoringTeams() {
  const { teams, matches } = data();
  const map = {};
  teams.forEach((t) => {
    map[t.name] = { team: t.name, GF: 0, GA: 0, GD: 0, P: 0, Pts: 0 };
  });

  matches.filter(hasNumericScore).forEach((m) => {
    if (!map[m.home] || !map[m.away]) return;
    const hs = Number(m.homeScore);
    const as = Number(m.awayScore);
    map[m.home].GF += hs;
    map[m.home].GA += as;
    map[m.home].P += 1;
    map[m.away].GF += as;
    map[m.away].GA += hs;
    map[m.away].P += 1;
    if (hs > as) map[m.home].Pts += 3;
    else if (hs < as) map[m.away].Pts += 3;
    else { map[m.home].Pts += 1; map[m.away].Pts += 1; }
  });

  Object.values(map).forEach((r) => { r.GD = r.GF - r.GA; });
  return Object.values(map)
    .sort((a, b) => b.GF - a.GF || b.GD - a.GD || b.Pts - a.Pts || a.team.localeCompare(b.team))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

function layout(active) {
  const name = escapeHtml(tournamentName());
  return `<header class="top"><div class="wrap nav"><a class="brand" href="index.html"><img src="logo.png"><span>${name}</span></a><nav class="links"><a class="${active === 'home' ? 'active' : ''}" href="index.html">Home</a><a class="${active === 'fixtures' ? 'active' : ''}" href="fixtures.html">Fixtures</a><a class="${active === 'results' ? 'active' : ''}" href="results.html">Results</a><a class="${active === 'standings' ? 'active' : ''}" href="standings.html">Standings</a><a class="${active === 'topscorers' ? 'active' : ''}" href="topscorers.html">Top Scorers</a><a class="${active === 'bracket' ? 'active' : ''}" href="bracket.html">Bracket</a><a class="${active === 'teams' ? 'active' : ''}" href="teams.html">Teams</a><a class="admin-dot" title="Admin" href="admin.html">⚙</a></nav></div></header>`;
}

function rerenderCurrentPage() {
  const p = location.pathname.split('/').pop() || 'index.html';
  if (p === 'index.html') renderHome();
  else if (p === 'fixtures.html') renderFixtures();
  else if (p === 'results.html') renderResults();
  else if (p === 'standings.html') renderStandings();
  else if (p === 'topscorers.html') renderTopScorers();
  else if (p === 'teams.html') renderTeams();
  else if (p === 'bracket.html') renderBracket();
  else if (p === 'admin.html') renderAdmin();
}

function applyResultDeadlineDefaults() {
  const d = data();
  let changed = 0;

  // Group / league phase: blank scores become 0-0 after the league deadline.
  d.matches = d.matches.map((m) => {
    if (!isLeaguePhaseMatch(m)) return m;
    if (!matchDeadlinePassed(d.settings, m)) return m;

    const missingHome = m.homeScore === '' || m.homeScore === null || m.homeScore === undefined;
    const missingAway = m.awayScore === '' || m.awayScore === null || m.awayScore === undefined;

    if (missingHome && missingAway) {
      changed += 1;
      return { ...m, homeScore: '0', awayScore: '0', autoDrawApplied: true, autoDrawAppliedAt: new Date().toISOString() };
    }
    return m;
  });

  // Knockout: if the round deadline passes and any leg in a tie is missing,
  // both teams in that tie are eliminated. No fake 0-0 result is added.
  const knockoutMatches = d.matches.filter((m) => isKnockoutMatch(m));
  const ties = groupKnockoutTies(knockoutMatches);
  ties.forEach((tie) => {
    if (!isKnockoutDeadlinePassed(d.settings, tie.round)) return;
    const hasMissing = tie.legs.some((m) => !hasNumericScore(m));
    if (!hasMissing) return;
    tie.legs.forEach((leg) => {
      if (!leg.autoEliminated) {
        leg.autoEliminated = true;
        leg.autoEliminatedAt = new Date().toISOString();
        leg.homeScore = '';
        leg.awayScore = '';
        changed += 1;
      }
    });
  });

  if (changed > 0) setData({ matches: d.matches });
  return changed;
}

function matchCard(m, editable = false) {
  const isPending = m.homeScore === '' || m.awayScore === '';
  let score = isPending ? 'vs' : `${m.homeScore} - ${m.awayScore}`;
  let scoreClass = isPending ? 'score vs-pill' : 'score score-result';

  if (m.autoEliminated) {
    score = 'ELIM';
    scoreClass = 'score elim-pill';
  }
  if (m.autoBye) {
    score = 'BYE';
    scoreClass = 'score bye-pill';
  }

  const legText = m.leg ? `<div class="match-leg">Leg ${m.leg}</div>` : '';
  return `<div class="match fixture-match"><div class="team-name team-home">${escapeHtml(m.home)}</div><div class="match-center"><div class="${scoreClass}">${escapeHtml(score)}</div>${legText}<div class="match-date">${escapeHtml(fixtureScheduleText(m))}</div></div><div class="team-name team-away">${escapeHtml(m.away)}</div>${editable ? `<div class="match-edit"><button class="btn" onclick="editResult(${m.id})">Edit</button></div>` : ''}</div>`;
}

function renderHome() {
  applyResultDeadlineDefaults();
  init('home');
  const { teams, matches, settings } = data();
  const scoring = topScoringTeams();
  const leader = scoring[0];
  const upcoming = matches.filter((m) => m.homeScore === '' || m.awayScore === '').slice(0, 4);
  const completed = matches.filter(hasNumericScore).slice(-5).reverse();
  const phaseText = isUclNewFormat(settings) ? '' : 'Group stage and knockout bracket';

  $('#app').innerHTML = `<section class="hero"><div class="wrap hero-grid"><div class="panel"><h1>${escapeHtml(tournamentName(settings))}</h1>${phaseText ? `<p>${escapeHtml(phaseText)}</p>` : ''}<a class="btn" href="fixtures.html">View Fixtures</a> <a class="btn alt" href="standings.html">View Standings</a><div class="stats"><div class="stat"><b>${teams.length}</b><br><span>Teams</span></div><div class="stat"><b>${settings.leaguePhaseMatchesPerTeam || 4}</b><br><span>League Matches / Team</span></div><div class="stat"><b>2 Leg</b><br><span>Knockout System</span></div></div></div><div class="panel"><h2>Upcoming Fixtures</h2>${upcoming.map((m) => matchCard(m)).join('') || '<p class="small">No upcoming fixtures yet.</p>'}</div></div></section><section class="section"><div class="wrap"><div class="title"><h2>Top Scoring Team</h2><a href="topscorers.html">View full list</a></div>${leader ? `<div class="topscorer-showcase"><div class="leader-card"><div class="leader-logo-wrap"><div class="leader-logo logo-placeholder">${escapeHtml(teamInitials(leader.team))}</div></div><div class="leader-label">Leading team</div><h3>${escapeHtml(leader.team)}</h3><div class="leader-goals">${leader.GF}</div><p class="small">Goals scored</p></div><div class="card topscorer-side-list">${scoring.slice(0, 5).map((row) => `<div class="topscorer-item ${row.rank === 1 ? 'is-leading' : ''}"><div class="topscorer-rank">#${row.rank}</div><div class="topscorer-team"><b>${escapeHtml(row.team)}</b><span class="small">P ${row.P} • GD ${row.GD}</span></div><div class="topscorer-goals">${row.GF}<span>goals</span></div></div>`).join('')}</div></div>` : '<div class="card"><p class="small">No top scoring data yet.</p></div>'}</div></section><section class="section"><div class="wrap"><div class="title"><h2>Latest Results</h2><a href="results.html">View all</a></div><div class="card">${completed.map((m) => matchCard(m)).join('') || '<p class="small">No results yet.</p>'}</div></div></section>`;
}

function renderFixtures() {
  applyResultDeadlineDefaults();
  init('fixtures');
  const ms = data().matches.filter((m) => m.homeScore === '' || m.awayScore === '' || m.autoEliminated).filter((m) => !m.autoBye);
  const groups = [...new Set(ms.map((m) => m.group || m.round || 'Other'))]
    .sort((a, b) => (GROUPS.indexOf(a) === -1 ? 99 : GROUPS.indexOf(a)) - (GROUPS.indexOf(b) === -1 ? 99 : GROUPS.indexOf(b)) || a.localeCompare(b));

  const groupedHtml = groups.map((g) => {
    const groupMatches = ms.filter((m) => (m.group || m.round || 'Other') === g);
    const title = GROUPS.includes(g) ? `Group ${escapeHtml(g)}` : escapeHtml(g);
    return `<h3 class="group-title">${title}</h3><div class="card">${groupMatches.map((m) => knockoutDisplayMatchCard(m)).join('')}</div>`;
  }).join('');

  $('#app').innerHTML = `<section class="section"><div class="wrap"><div class="title"><h2>Fixtures</h2></div>${groupedHtml || '<div class="card">No upcoming fixtures.</div>'}</div></section>`;
}

function renderResults() {
  applyResultDeadlineDefaults();
  init('results');
  const d = data();
  const ms = d.matches.filter((m) => hasNumericScore(m) || m.autoEliminated || m.autoBye);
  const groups = [...new Set(ms.map((m) => m.group || m.round || 'Other'))]
    .sort((a, b) => (GROUPS.indexOf(a) === -1 ? 99 : GROUPS.indexOf(a)) - (GROUPS.indexOf(b) === -1 ? 99 : GROUPS.indexOf(b)) || a.localeCompare(b));

  const groupedHtml = groups.map((g) => {
    const groupMatches = ms.filter((m) => (m.group || m.round || 'Other') === g);
    const title = GROUPS.includes(g) ? `Group ${escapeHtml(g)}` : escapeHtml(g);
    return `<h3 class="group-title">${title}</h3><div class="card">${groupMatches.map((m) => knockoutDisplayMatchCard(m)).join('')}</div>`;
  }).join('');

  $('#app').innerHTML = `<section class="section"><div class="wrap"><div class="title"><h2>Results</h2></div>${groupedHtml || '<div class="card">No results yet.</div>'}</div></section>`;
}

function renderTeams() {
  init('teams');
  const { teams, settings } = data();
  if (isUclNewFormat(settings)) {
    $('#app').innerHTML = `<section class="section"><div class="wrap"><div class="title"><h2>Teams</h2><span class="tag">${teams.length}/${settings.teamLimit || 24} teams</span></div><div class="grid">${teams.map((t, i) => `<div class="card"><h3>${escapeHtml(t.name)}</h3><span class="tag">League Phase #${i + 1}</span></div>`).join('') || '<p>No teams yet.</p>'}</div></div></section>`;
    return;
  }

  const groups = [...new Set(teams.map((t) => t.group))].sort();
  $('#app').innerHTML = `<section class="section"><div class="wrap"><h2>Teams</h2>${groups.map((g) => `<h3 class="group-title">Group ${escapeHtml(g)}</h3><div class="grid">${teams.filter((t) => t.group === g).map((t) => `<div class="card"><h3>${escapeHtml(t.name)}</h3><span class="tag">Group ${escapeHtml(t.group)}</span></div>`).join('')}</div>`).join('') || '<p>No teams yet.</p>'}</div></section>`;
}

function renderStandings() {
  applyResultDeadlineDefaults();
  init('standings');
  const { settings } = data();
  const rows = standings();

  if (isUclNewFormat(settings)) {
    $('#app').innerHTML = `<section class="section"><div class="wrap"><div class="title"><h2>League Phase Standings</h2><span class="tag">Top 8 direct • 9-24 playoff</span></div><div class="table-scroll"><table class="table standings-table"><tr><th>Rank</th><th>Team</th><th>Status</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>${rows.map((r, i) => `<tr><td><b>#${i + 1}</b></td><td><b>${escapeHtml(r.team)}</b></td><td>${rankLabel(i)}</td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF}</td><td>${r.GA}</td><td>${r.GD}</td><td><b>${r.Pts}</b></td></tr>`).join('')}</table></div></div></section>`;
    return;
  }

  const groups = [...new Set(rows.map((r) => r.group))];
  $('#app').innerHTML = `<section class="section"><div class="wrap"><h2>Group Standings</h2>${groups.map((g) => `<h3 class="group-title">Group ${escapeHtml(g)}</h3><table class="table standings-table"><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>${rows.filter((r) => r.group === g).map((r) => `<tr><td><b>${escapeHtml(r.team)}</b></td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF}</td><td>${r.GA}</td><td>${r.GD}</td><td><b>${r.Pts}</b></td></tr>`).join('')}</table>`).join('') || '<p>No standings yet.</p>'}</div></section>`;
}

function renderTopScorers() {
  applyResultDeadlineDefaults();
  init('topscorers');
  const rows = topScoringTeams();
  const leader = rows[0];
  if (!leader) {
    $('#app').innerHTML = `<section class="section"><div class="wrap"><div class="title"><h2>Top Scoring Teams</h2></div><div class="card"><p class="small">No teams yet.</p></div></div></section>`;
    return;
  }
  $('#app').innerHTML = `<section class="section"><div class="wrap"><div class="title"><h2>Top Scoring Teams</h2><span class="tag">Goals from league phase and knockout</span></div><div class="topscorer-showcase"><div class="leader-card"><div class="leader-logo-wrap"><div class="leader-logo logo-placeholder">${escapeHtml(teamInitials(leader.team))}</div></div><div class="leader-label">Leading team</div><div class="leader-rank">#${leader.rank}</div><h3>${escapeHtml(leader.team)}</h3><div class="leader-goals">${leader.GF}</div><p class="small">Goals scored</p><div class="leader-meta"><span class="tag">Matches: ${leader.P}</span><span class="tag">GD: ${leader.GD}</span></div></div><div class="card topscorer-side-list">${rows.slice(0, 5).map((row) => `<div class="topscorer-item ${row.rank === 1 ? 'is-leading' : ''}"><div class="topscorer-rank">#${row.rank}</div><div class="topscorer-team"><b>${escapeHtml(row.team)}</b><span class="small">P ${row.P} • GD ${row.GD}</span></div><div class="topscorer-goals">${row.GF}<span>goals</span></div></div>`).join('')}</div></div><div class="table-scroll" style="margin-top:22px"><table class="table top-scorer-table"><tr><th>Rank</th><th>Team</th><th>Goals</th><th>Matches</th><th>GD</th><th>Pts</th></tr>${rows.map((row) => `<tr><td><b>#${row.rank}</b></td><td><b>${escapeHtml(row.team)}</b></td><td>${row.GF}</td><td>${row.P}</td><td>${row.GD}</td><td>${row.Pts}</td></tr>`).join('')}</table></div></div></section>`;
}

function qualified() {
  const { settings } = data();
  const rows = standings();
  if (isUclNewFormat(settings)) return rows.slice(0, 24).map((r) => r.team);

  const out = [];
  GROUPS.slice(0, settings.groupCount).forEach((g) => {
    out.push(...rows.filter((r) => r.group === g).slice(0, settings.qualifyPerGroup).map((r) => r.team));
  });
  return out;
}

function directRoundOf16Teams() {
  return standings().slice(0, 8).map((r) => r.team);
}

function playoffTeams() {
  return standings().slice(8, 24).map((r) => r.team);
}

function firstKnockoutRoundName(teamCount) {
  if (isUclNewFormat()) return 'Knockout Playoff';
  if (teamCount === 32) return 'Round of 32';
  if (teamCount === 16) return 'Round of 16';
  if (teamCount === 8) return 'Quarter Finals';
  if (teamCount === 4) return 'Semi Finals';
  if (teamCount === 2) return 'Final';
  return '';
}

function pairKnockoutTeams(teams) {
  const arr = [...teams].filter(Boolean);
  if (arr.length % 2 === 1) arr.push('BYE');
  const pairs = [];
  for (let i = 0; i < arr.length / 2; i += 1) {
    pairs.push([arr[i], arr[arr.length - 1 - i]]);
  }
  return pairs;
}

function buildKnockoutRound(teams, round) {
  const pairs = pairKnockoutTeams(teams);
  const stamp = Date.now();
  const ms = [];

  pairs.forEach(([home, away], i) => {
    const tieId = `${round.replace(/\s+/g, '-')}-${stamp}-${i}`;
    if (!away || away === 'BYE') {
      ms.push({ id: stamp + i * 10 + 1, tieId, tieHome: home, tieAway: 'BYE', leg: 1, round, group: round, home, away: 'BYE', homeScore: '1', awayScore: '0', autoBye: true, date: '', time: '' });
      return;
    }

    ms.push({ id: stamp + i * 10 + 1, tieId, tieHome: home, tieAway: away, leg: 1, round, group: round, home, away, homeScore: '', awayScore: '', date: '', time: '' });
    ms.push({ id: stamp + i * 10 + 2, tieId, tieHome: home, tieAway: away, leg: 2, round, group: round, home: away, away: home, homeScore: '', awayScore: '', date: '', time: '' });
  });

  return ms;
}

function groupKnockoutTies(matches) {
  const map = new Map();
  matches.filter((m) => isKnockoutMatch(m)).forEach((m) => {
    const key = m.tieId || String(m.id);
    if (!map.has(key)) map.set(key, { tieId: key, round: m.round, tieHome: m.tieHome || m.home, tieAway: m.tieAway || m.away, legs: [] });
    map.get(key).legs.push(m);
  });
  return [...map.values()].map((t) => ({ ...t, legs: t.legs.sort((a, b) => (a.leg || 1) - (b.leg || 1)) }));
}

function aggregateForTie(legs) {
  const first = legs[0];
  const a = first.tieHome || first.home;
  const b = first.tieAway || first.away;
  if (b === 'BYE') return { a, b, aGoals: 1, bGoals: 0, complete: true, eliminated: false, winner: a };

  let aGoals = 0;
  let bGoals = 0;
  let complete = true;
  let eliminated = legs.some((m) => m.autoEliminated);

  legs.forEach((m) => {
    if (!hasNumericScore(m)) {
      complete = false;
      return;
    }
    const hs = Number(m.homeScore);
    const as = Number(m.awayScore);
    if (m.home === a) {
      aGoals += hs;
      bGoals += as;
    } else {
      bGoals += hs;
      aGoals += as;
    }
  });

  let winner = '';
  if (!eliminated && complete && aGoals !== bGoals) winner = aGoals > bGoals ? a : b;
  return { a, b, aGoals, bGoals, complete, eliminated, winner };
}

function knockoutWinner(match) {
  if (!match || !isKnockoutMatch(match)) return '';
  const tieId = match.tieId || String(match.id);
  const tie = groupKnockoutTies(data().matches).find((t) => t.tieId === tieId);
  if (!tie) return '';
  return aggregateForTie(tie.legs).winner || '';
}

function knockoutTieStatusHtml(tie) {
  const agg = aggregateForTie(tie.legs);
  if (agg.eliminated) return '<span class="tag elim-tag">Both eliminated</span>';
  if (agg.winner) return `<span class="tag">Winner: ${escapeHtml(agg.winner)}</span><br><span class="small">Aggregate ${agg.aGoals}-${agg.bGoals}</span>`;
  if (agg.complete && agg.aGoals === agg.bGoals) return `<span class="tag draw-tag">Aggregate draw</span><br><span class="small">Admin must decide winner manually by score.</span>`;
  return '<span class="small">Pending</span>';
}

function knockoutDisplayMatchCard(m) {
  return matchCard(m);
}

function knockoutInputValue(match, side) {
  if (match.autoEliminated || match.autoBye) return '';
  return side === 'home' ? match.homeScore : match.awayScore;
}

function renderBracket() {
  applyResultDeadlineDefaults();
  init('bracket');
  const d = data();
  const q = qualified();
  const kos = d.matches.filter((m) => isKnockoutMatch(m));
  const rounds = knockoutRoundListFromMatches(d.matches);

  const bracketHtml = rounds.map((round) => {
    const ties = groupKnockoutTies(kos.filter((m) => m.round === round));
    return `<h3 class="group-title">${escapeHtml(round)}</h3><div class="bracket-tie-grid">${ties.map((tie) => `<div class="card bracket-tie"><div class="tie-head"><b>${escapeHtml(tie.tieHome)}</b><span>vs</span><b>${escapeHtml(tie.tieAway)}</b></div>${tie.legs.map((m) => matchCard(m)).join('')}<div class="tie-status">${knockoutTieStatusHtml(tie)}</div></div>`).join('')}</div>`;
  }).join('');

  $('#app').innerHTML = `<section class="section"><div class="wrap"><h2>Knockout Bracket</h2><p class="small">Knockout rounds use 2 Leg aggregate system. If a knockout tie has missing result after its deadline, both teams are eliminated.</p>${bracketHtml || `<div class="card"><h3>Qualified / League Phase Teams</h3>${q.map((t) => `<div class="slot">${escapeHtml(t)}</div>`).join('') || '<p class="small">No qualified teams yet.</p>'}<p class="small">No knockout fixtures generated yet.</p></div>`}</div></section>`;
}

function buildUclLeaguePhaseFixtures(teams, settings) {
  const arr = [...teams];
  const targetRounds = Math.max(1, Math.min(Number(settings.leaguePhaseMatchesPerTeam) || 4, Math.max(1, arr.length - 1)));
  const list = arr.length % 2 === 0 ? [...arr] : [...arr, { name: 'BYE' }];
  const n = list.length;
  const fixed = list[0];
  let rotating = list.slice(1);
  const ms = [];
  let id = Date.now();

  for (let round = 1; round <= targetRounds; round += 1) {
    const current = [fixed, ...rotating];
    for (let i = 0; i < n / 2; i += 1) {
      let home = current[i];
      let away = current[n - 1 - i];
      if (!home || !away || home.name === 'BYE' || away.name === 'BYE') continue;
      if (round % 2 === 0) [home, away] = [away, home];
      ms.push({ id: id++, round: 'League Phase', group: 'League Phase', home: home.name, away: away.name, homeScore: '', awayScore: '', date: '', time: '', leaguePhaseRound: round });
    }
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, rotating.length - 1)];
  }
  return ms;
}

function buildGroupFixtures(teams, settings) {
  if (isUclNewFormat(settings)) return buildUclLeaguePhaseFixtures(teams, settings);

  const ms = [];
  GROUPS.slice(0, settings.groupCount).forEach((g) => {
    const arr = teams.filter((t) => t.group === g);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        ms.push({ id: Date.now() + ms.length, round: 'Group Stage', group: g, home: arr[i].name, away: arr[j].name, homeScore: '', awayScore: '', date: '', time: '' });
      }
    }
  });
  return ms;
}

function adminDash() {
  return `<section class="section"><div class="wrap admin-layout"><div class="side panel"><button data-tab="settings" class="active">Tournament Settings</button><button data-tab="teams">Teams</button><button data-tab="fixtures">Fixtures</button><button data-tab="results">League Results</button><button data-tab="knockout">Knockout 2 Leg</button><button onclick="sessionStorage.removeItem('efl_admin');location.reload()">Logout</button></div><div class="panel"><div id="adminContent"></div></div></div></section>`;
}

function showAdminTab(tab) {
  const { settings, teams, matches } = data();
  const c = $('#adminContent');
  if (!c) return;

  if (tab === 'settings') {
    c.innerHTML = `<h2>Tournament Settings</h2><div id="adminMessage"></div><div class="form"><label>Tournament name <input id="tournamentName" value="${escapeHtml(tournamentName(settings))}" placeholder="Example: EFL Champions League"></label><label>Format <select id="tournamentMode"><option value="ucl_new" ${(settings.tournamentMode || 'ucl_new') === 'ucl_new' ? 'selected' : ''}>New UCL Format / 24 Teams</option><option value="groups" ${settings.tournamentMode === 'groups' ? 'selected' : ''}>Classic Groups</option></select></label><label>Team limit <input id="teamLimit" type="number" min="2" max="48" value="${settings.teamLimit || 24}"></label><label>League phase matches per team <input id="leaguePhaseMatchesPerTeam" type="number" min="1" max="8" value="${settings.leaguePhaseMatchesPerTeam || 4}"></label><label>Number of groups <input id="groupCount" type="number" min="1" max="12" value="${settings.groupCount}"></label><label>Teams per group <input id="teamsPerGroup" type="number" min="2" max="8" value="${settings.teamsPerGroup}"></label><label>Teams qualify per group <input id="qualifyPerGroup" type="number" min="1" max="8" value="${settings.qualifyPerGroup}"></label><label>Admin PIN <input id="adminPin" type="password" value="${escapeHtml(settings.adminPin)}" placeholder="Set admin PIN"></label><button class="btn" onclick="saveSettings()">Save Settings</button><button class="btn alt" type="button" onclick="applyUclDefaults()">Apply UCL 24-Team Defaults</button></div><p class="small">New UCL format: 24-team league phase. Top 8 go direct to Round of 16. Rank 9-24 enter Knockout Playoff. Knockout is 2 Leg aggregate.</p>`;
  }

  if (tab === 'teams') {
    if (isUclNewFormat(settings)) {
      c.innerHTML = `<h2>Teams / League Phase</h2><div id="adminMessage"></div><div class="admin-tools"><div class="tool-card"><h3>Paste teams at once</h3><p class="small">Paste one team per line. This UCL format works best with 24 teams.</p><textarea id="bulkTeams" rows="10" placeholder="Team 1\nTeam 2\nTeam 3"></textarea><div class="check-row"><label><input id="replaceTeams" type="checkbox" checked> Replace current teams</label><label><input id="autoFixtures" type="checkbox" checked> Generate UCL league phase fixtures</label></div><button class="btn" onclick="bulkCreateTeams()">Create Teams</button></div><div class="tool-card"><h3>Single team add</h3><div class="form compact"><input id="teamName" placeholder="Team name"><button class="btn" onclick="addTeam()">Add Team</button></div><hr><p class="small"><b>Current:</b> ${teams.length}/${settings.teamLimit || 24} teams</p><button class="btn alt" onclick="shuffleExistingTeams()">Shuffle + Regenerate League Phase</button><button class="btn danger" onclick="clearTeamsAndMatches()">Clear Teams + Fixtures</button></div></div><br><h3>Team List</h3><div class="table-scroll"><table class="table"><tr><th>#</th><th>Team</th><th>Action</th></tr>${teams.map((t, i) => `<tr><td>${i + 1}</td><td><input value="${escapeHtml(t.name)}" onchange="updateTeam(${t.id},'name',this.value)"></td><td><button onclick="deleteTeam(${t.id})">Delete</button></td></tr>`).join('') || '<tr><td colspan="3">No teams yet.</td></tr>'}</table></div>`;
      return;
    }

    const groupedSummary = GROUPS.slice(0, settings.groupCount).map((g) => `${g}: ${teams.filter((t) => t.group === g).length}`).join(' • ');
    c.innerHTML = `<h2>Bulk Teams + Auto Group Shuffle</h2><div id="adminMessage"></div><div class="admin-tools"><div class="tool-card"><h3>Paste teams at once</h3><p class="small">Paste one team per line. Commas also work. The system will shuffle and assign teams evenly into groups.</p><textarea id="bulkTeams" rows="10"></textarea><div class="check-row"><label><input id="replaceTeams" type="checkbox" checked> Replace current teams</label><label><input id="autoFixtures" type="checkbox" checked> Generate group fixtures after grouping</label></div><button class="btn" onclick="bulkCreateTeams()">Create Groups Automatically</button><button class="btn alt" onclick="shuffleExistingTeams()">Shuffle Existing Teams</button></div><div class="tool-card"><h3>Single team add</h3><div class="form compact"><input id="teamName" placeholder="Team name"><select id="teamGroup">${groupOptions('A', settings.groupCount)}</select><button class="btn" onclick="addTeam()">Add Team</button></div><hr><p class="small"><b>Current:</b> ${teams.length}/${settings.teamLimit} teams</p><p class="small"><b>Groups:</b> ${escapeHtml(groupedSummary || 'No teams yet')}</p><button class="btn danger" onclick="clearTeamsAndMatches()">Clear Teams + Fixtures</button></div></div><br><h3>Team List</h3><div class="table-scroll"><table class="table"><tr><th>Team</th><th>Group</th><th>Action</th></tr>${teams.map((t) => `<tr><td><input value="${escapeHtml(t.name)}" onchange="updateTeam(${t.id},'name',this.value)"></td><td><select onchange="updateTeam(${t.id},'group',this.value)">${groupOptions(t.group, settings.groupCount)}</select></td><td><button onclick="deleteTeam(${t.id})">Delete</button></td></tr>`).join('') || '<tr><td colspan="3">No teams yet.</td></tr>'}</table></div>`;
  }

  if (tab === 'fixtures') {
    const fixtureGroups = [...new Set(matches.map((m) => m.group || m.round || 'Other'))]
      .sort((a, b) => a.localeCompare(b));
    const fixtureTables = fixtureGroups.map((g) => {
      const title = GROUPS.includes(g) ? `Group ${escapeHtml(g)}` : escapeHtml(g);
      const rows = matches.filter((m) => (m.group || m.round || 'Other') === g).map((m) => `<tr><td>${escapeHtml(m.round)}${m.leg ? ` • Leg ${m.leg}` : ''}</td><td><b>${escapeHtml(m.home)}</b><br><span class="small">vs ${escapeHtml(m.away)}</span></td><td><input id="date_${m.id}" type="date" value="${escapeHtml((m.date && m.date !== 'TBA') ? m.date : '')}"></td><td><input id="time_${m.id}" type="time" value="${escapeHtml((m.time && m.time !== 'TBA') ? m.time : '')}"></td></tr>`).join('');
      return `<h3 class="group-title">${title}</h3><div class="table-scroll"><table class="table"><tr><th>Round</th><th>Match</th><th>Date</th><th>Time</th></tr>${rows}</table></div>`;
    }).join('');
    c.innerHTML = `<h2>Fixtures + Optional Schedule</h2><div id="adminMessage"></div><div class="admin-actions"><button class="btn" onclick="generateFixtures()">${isUclNewFormat(settings) ? 'Generate UCL League Phase Fixtures' : 'Generate Group Fixtures'}</button><button class="btn alt" onclick="clearFixtureSchedule()">Clear Date/Time Only</button><button class="btn danger" onclick="clearFixtures()">Clear Fixtures</button></div><p class="small">UCL league phase uses ${settings.leaguePhaseMatchesPerTeam || 4} match(es) per team. Knockout uses 2 Leg aggregate score.</p><div class="tool-card"><h3>Quick schedule apply</h3><div class="form compact"><input id="bulkFixtureDate" type="date"><input id="bulkFixtureTime" type="time"><button class="btn" onclick="applyBulkFixtureSchedule()">Apply to All Fixtures</button></div></div><br>${fixtureTables || '<div class="card">No fixtures yet. Generate fixtures first.</div>'}<div class="admin-actions"><button class="btn" onclick="saveFixtureSchedule()">Save Fixture Date/Time</button></div>`;
  }

  if (tab === 'results') {
    const leagueMatches = matches.filter((m) => isLeaguePhaseMatch(m));
    const deadlinePassed = isResultDeadlinePassed(settings);
    const deadlineStatus = deadlinePassed ? `Deadline passed: ${escapeHtml(resultDeadlineText(settings))}. Blank league phase results become 0-0.` : `Deadline: ${escapeHtml(resultDeadlineText(settings))}`;
    c.innerHTML = `<h2>League Result Entry</h2><div id="adminMessage"></div><div class="tool-card"><h3>League result deadline</h3><p class="small">After this date/time, blank league phase results become 0-0. Knockout blank results are handled in the Knockout tab and can eliminate both teams.</p><div class="form compact"><input id="resultDeadlineDate" type="date" value="${escapeHtml(settings.resultDeadlineDate || '')}"><input id="resultDeadlineTime" type="time" value="${escapeHtml(settings.resultDeadlineTime || '')}"><button class="btn" onclick="saveResultDeadline()">Save Deadline</button><button class="btn alt" onclick="applyDeadlineDrawsNow()">Apply Due Rules Now</button></div><p class="small">${deadlineStatus}</p></div><br><div class="table-scroll"><table class="table result-table"><tr><th>Round</th><th>Match</th><th>Home</th><th>Away</th><th>Status</th></tr>${leagueMatches.map((m) => `<tr><td>${escapeHtml(m.group || m.round)}</td><td><b>${escapeHtml(m.home)}</b><br><span class="small">vs ${escapeHtml(m.away)}</span></td><td><input class="score-input" id="hs_${m.id}" type="number" min="0" inputmode="numeric" value="${escapeHtml(m.homeScore)}"></td><td><input class="score-input" id="as_${m.id}" type="number" min="0" inputmode="numeric" value="${escapeHtml(m.awayScore)}"></td><td>${m.autoDrawApplied ? '<span class="tag">Auto 0-0</span>' : '<span class="small">Manual / pending</span>'}</td></tr>`).join('') || '<tr><td colspan="5">No league fixtures yet.</td></tr>'}</table></div><div class="admin-actions"><button class="btn" onclick="saveAllResults()">Save League Results</button><button class="btn alt" onclick="clearAllScores()">Clear League Scores</button></div>`;
  }

  if (tab === 'knockout') {
    const kos = matches.filter((m) => isKnockoutMatch(m));
    const ranked = standings();
    const qText = isUclNewFormat(settings) ? `${ranked.length} team(s) in league table. Top 8 direct, rank 9-24 playoff.` : `${qualified().length} team(s) qualified from group standings.`;
    const roundsForDeadline = UCL_KO_ROUNDS.filter((round) => kos.some((m) => m.round === round) || round === 'Knockout Playoff' || round === 'Round of 16' || round === 'Quarter Finals' || round === 'Semi Finals' || round === 'Final');
    const deadlineRows = roundsForDeadline.map((round, i) => {
      const saved = (settings.knockoutDeadlines || {})[round] || {};
      return `<tr><td><b>${escapeHtml(round)}</b><br><span class="small">${escapeHtml(knockoutDeadlineText(settings, round))}</span></td><td><input id="koDeadlineDate_${i}" data-round="${escapeHtml(round)}" type="date" value="${escapeHtml(saved.date || '')}"></td><td><input id="koDeadlineTime_${i}" data-round="${escapeHtml(round)}" type="time" value="${escapeHtml(saved.time || '')}"></td></tr>`;
    }).join('');
    const scheduleRows = kos.map((m) => `<tr><td>${escapeHtml(m.round)}${m.leg ? ` • Leg ${m.leg}` : ''}</td><td><b>${escapeHtml(m.home)}</b><br><span class="small">vs ${escapeHtml(m.away)}</span></td><td><input id="koDate_${m.id}" type="date" value="${escapeHtml((m.date && m.date !== 'TBA') ? m.date : '')}"></td><td><input id="koTime_${m.id}" type="time" value="${escapeHtml((m.time && m.time !== 'TBA') ? m.time : '')}"></td></tr>`).join('');
    const ties = groupKnockoutTies(kos);
    const resultRows = ties.map((tie) => tie.legs.map((m) => `<tr><td>${escapeHtml(m.round)}${m.leg ? `<br><span class="small">Leg ${m.leg}</span>` : ''}</td><td><b>${escapeHtml(m.home)}</b><br><span class="small">vs ${escapeHtml(m.away)}</span></td><td><input class="score-input" id="koHs_${m.id}" type="number" min="0" inputmode="numeric" value="${escapeHtml(knockoutInputValue(m, 'home'))}" ${m.autoEliminated || m.autoBye ? 'disabled' : ''}></td><td><input class="score-input" id="koAs_${m.id}" type="number" min="0" inputmode="numeric" value="${escapeHtml(knockoutInputValue(m, 'away'))}" ${m.autoEliminated || m.autoBye ? 'disabled' : ''}></td><td>${knockoutTieStatusHtml(tie)}</td></tr>`).join('')).join('');
    c.innerHTML = `<h2>Knockout 2 Leg</h2><div id="adminMessage"></div><div class="tool-card"><h3>UCL knockout format</h3><p class="small">${escapeHtml(qText)}</p><p class="small"><b>2 Leg:</b> every knockout tie has Leg 1 and Leg 2. Aggregate score decides the winner.</p><p class="small"><b>Deadline rule:</b> if a knockout tie still has missing result after its round deadline, both teams are eliminated automatically. When the next round is generated, remaining teams can receive BYE advancement if needed.</p><div class="admin-actions"><button class="btn" onclick="generateFirstKnockoutRound()">Generate UCL Playoff</button><button class="btn alt" onclick="generateNextKnockoutRound()">Generate Next Round</button><button class="btn danger" onclick="clearKnockoutFixtures()">Clear Knockout Fixtures</button></div></div><br><div class="tool-card"><h3>Knockout deadlines</h3><div class="table-scroll"><table class="table"><tr><th>Round</th><th>Deadline Date</th><th>Deadline Time</th></tr>${deadlineRows}</table></div><div class="admin-actions"><button class="btn" onclick="saveKnockoutDeadlines()">Save Knockout Deadlines</button><button class="btn alt" onclick="applyDeadlineDrawsNow()">Apply Due Rules Now</button></div></div><br><div class="tool-card"><h3>Knockout date/time</h3><div class="table-scroll"><table class="table"><tr><th>Round</th><th>Match</th><th>Date</th><th>Time</th></tr>${scheduleRows || '<tr><td colspan="4">No knockout fixtures yet.</td></tr>'}</table></div><div class="admin-actions"><button class="btn" onclick="saveKnockoutSchedule()">Save Knockout Date/Time</button></div></div><br><div class="tool-card"><h3>Knockout results</h3><div class="table-scroll"><table class="table"><tr><th>Round</th><th>Match</th><th>Home</th><th>Away</th><th>Tie Status</th></tr>${resultRows || '<tr><td colspan="5">No knockout fixtures yet.</td></tr>'}</table></div><div class="admin-actions"><button class="btn" onclick="saveKnockoutResults()">Save Knockout Results</button></div></div>`;
  }
}

window.applyUclDefaults = () => {
  const d = data();
  d.settings.tournamentMode = 'ucl_new';
  d.settings.teamLimit = 24;
  d.settings.groupCount = 1;
  d.settings.teamsPerGroup = 24;
  d.settings.qualifyPerGroup = 24;
  d.settings.leaguePhaseMatchesPerTeam = 4;
  setData({ settings: d.settings });
  showAdminTab('settings');
  adminMessage('UCL 24-team defaults applied.', 'ok');
};

window.saveSettings = () => {
  const s = data().settings;
  s.tournamentName = ($('#tournamentName')?.value || '').trim() || defaults.settings.tournamentName;
  s.tournamentMode = ($('#tournamentMode')?.value || 'ucl_new');
  s.teamLimit = Math.max(2, Math.min(48, Number($('#teamLimit')?.value) || 24));
  s.leaguePhaseMatchesPerTeam = Math.max(1, Math.min(8, Number($('#leaguePhaseMatchesPerTeam')?.value) || 4));
  s.groupCount = Math.max(1, Math.min(12, Number($('#groupCount')?.value) || 1));
  s.teamsPerGroup = Math.max(2, Math.min(24, Number($('#teamsPerGroup')?.value) || 4));
  s.qualifyPerGroup = Math.max(1, Math.min(24, Number($('#qualifyPerGroup')?.value) || 2));
  const newAdminPin = ($('#adminPin')?.value || '').trim();
  if (newAdminPin.length < 4) return adminMessage('Admin PIN must be at least 4 characters.', 'bad');
  s.adminPin = newAdminPin;
  setData({ settings: s });
  showAdminTab('settings');
  adminMessage('Settings saved.', 'ok');
};

window.bulkCreateTeams = () => {
  const d = data();
  const pasted = parseTeamNames($('#bulkTeams')?.value || '');
  const replace = $('#replaceTeams')?.checked;
  const autoFixtures = $('#autoFixtures')?.checked;
  if (pasted.length === 0) return adminMessage('Paste team names first.', 'bad');
  if (pasted.length > (d.settings.teamLimit || 24)) return adminMessage(`You pasted ${pasted.length} teams. Maximum is ${d.settings.teamLimit || 24}.`, 'bad');

  const names = replace ? pasted : parseTeamNames([...d.teams.map((t) => t.name), ...pasted].join('\n'));
  let teams;
  if (isUclNewFormat(d.settings)) {
    teams = names.map((name, index) => ({ id: Date.now() + index, name, group: 'League Phase' }));
  } else {
    const capacity = d.settings.groupCount * d.settings.teamsPerGroup;
    if (names.length > capacity) return adminMessage(`You have ${names.length} teams, but current capacity is ${capacity}.`, 'bad');
    teams = createGroupedTeamsFromNames(names, d.settings, false, d.teams);
  }

  const newData = { teams };
  if (autoFixtures) newData.matches = buildGroupFixtures(teams, d.settings);
  else if (replace) newData.matches = [];
  setData(newData);
  showAdminTab('teams');
  adminMessage(`${teams.length} team(s) created${autoFixtures ? ' and fixtures generated' : ''}.`, 'ok');
};

window.addTeam = () => {
  const d = data();
  if (d.teams.length >= (d.settings.teamLimit || 24)) return alert(`Maximum ${d.settings.teamLimit || 24} teams`);
  const name = ($('#teamName')?.value || '').trim();
  if (!name) return;
  if (d.teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) return alert('This team already exists.');
  d.teams.push({ id: Date.now(), name, group: isUclNewFormat(d.settings) ? 'League Phase' : ($('#teamGroup')?.value || 'A') });
  setData({ teams: d.teams });
  showAdminTab('teams');
};

window.shuffleExistingTeams = () => {
  const d = data();
  if (d.teams.length < 2) return adminMessage('Add at least 2 teams before shuffling.', 'bad');
  let teams;
  if (isUclNewFormat(d.settings)) {
    teams = shuffleArray(d.teams.map((t) => t.name)).map((name, index) => ({ id: Date.now() + index, name, group: 'League Phase' }));
  } else {
    teams = createGroupedTeamsFromNames(d.teams.map((t) => t.name), d.settings, true, d.teams);
  }
  const matches = buildGroupFixtures(teams, d.settings);
  setData({ teams, matches });
  showAdminTab('teams');
  adminMessage('Teams shuffled and fixtures regenerated.', 'ok');
};

window.generateFixtures = () => {
  const d = data();
  const ms = buildGroupFixtures(d.teams, d.settings);
  setData({ matches: ms });
  showAdminTab('fixtures');
  adminMessage(`${ms.length} fixture(s) generated.`, 'ok');
};

window.saveAllResults = () => {
  const d = data();
  const invalid = [];
  d.matches = d.matches.map((m) => {
    if (!isLeaguePhaseMatch(m)) return m;
    const hs = $(`#hs_${m.id}`)?.value.trim() ?? '';
    const as = $(`#as_${m.id}`)?.value.trim() ?? '';
    if ((hs === '' && as !== '') || (hs !== '' && as === '')) {
      invalid.push(`${m.home} vs ${m.away}`);
      return m;
    }
    return { ...m, homeScore: hs, awayScore: as, autoDrawApplied: false, autoDrawAppliedAt: '' };
  });
  if (invalid.length) return adminMessage(`Some matches have only one score filled: ${invalid.slice(0, 3).join(', ')}`, 'bad');
  setData({ matches: d.matches });
  showAdminTab('results');
  adminMessage('League results saved.', 'ok');
};

window.clearAllScores = () => {
  if (!confirm('Clear league phase scores but keep fixtures?')) return;
  const d = data();
  d.matches = d.matches.map((m) => isLeaguePhaseMatch(m) ? { ...m, homeScore: '', awayScore: '', autoDrawApplied: false, autoDrawAppliedAt: '' } : m);
  setData({ matches: d.matches });
  showAdminTab('results');
  adminMessage('League scores cleared.', 'ok');
};

window.generateFirstKnockoutRound = () => {
  const d = data();
  if (isUclNewFormat(d.settings)) {
    const ranked = standings();
    if (ranked.length < 24) return adminMessage(`UCL format needs 24 teams in the league table. Current: ${ranked.length}.`, 'bad');
    const playoff = playoffTeams();
    if (playoff.length < 2) return adminMessage('Not enough playoff teams from ranks 9-24.', 'bad');
    if (d.matches.some((m) => isKnockoutMatch(m)) && !confirm('Existing knockout fixtures will be replaced. Continue?')) return;
    const leagueMatches = d.matches.filter((m) => isLeaguePhaseMatch(m));
    const firstRound = buildKnockoutRound(playoff, 'Knockout Playoff');
    setData({ matches: [...leagueMatches, ...firstRound] });
    showAdminTab('knockout');
    adminMessage(`Knockout Playoff generated: ${firstRound.length / 2} 2-leg tie(s).`, 'ok');
    return;
  }

  const q = qualified();
  if (!isPowerOfTwo(q.length)) return adminMessage(`Qualified team count is ${q.length}. Use 2, 4, 8, 16, or 32 teams for automatic knockout generation.`, 'bad');
  const round = firstKnockoutRoundName(q.length);
  if (!round) return adminMessage('Cannot decide knockout round from qualified team count.', 'bad');
  const existingKnockout = d.matches.some((m) => isKnockoutMatch(m));
  if (existingKnockout && !confirm('Existing knockout fixtures will be replaced. Continue?')) return;
  const groupMatches = d.matches.filter((m) => isLeaguePhaseMatch(m));
  const firstRound = buildKnockoutRound(q, round);
  setData({ matches: [...groupMatches, ...firstRound] });
  showAdminTab('knockout');
  adminMessage(`${round} generated.`, 'ok');
};

window.generateNextKnockoutRound = () => {
  const d = data();
  applyResultDeadlineDefaults();
  const kos = data().matches.filter((m) => isKnockoutMatch(m));
  if (!kos.length) return adminMessage('Generate knockout playoff first.', 'bad');
  const currentRound = latestKnockoutRound(kos);
  const nextRound = nextKnockoutRoundName(currentRound);
  if (!nextRound) return adminMessage('No next round available.', 'bad');

  const ties = groupKnockoutTies(kos.filter((m) => m.round === currentRound));
  const pending = [];
  const winners = [];
  const eliminated = [];
  ties.forEach((tie) => {
    const agg = aggregateForTie(tie.legs);
    if (agg.winner) winners.push(agg.winner);
    else if (agg.eliminated) eliminated.push(`${agg.a} / ${agg.b}`);
    else pending.push(`${agg.a} vs ${agg.b}`);
  });

  if (pending.length) return adminMessage(`Complete these ${currentRound} tie(s) first or wait until deadline: ${pending.slice(0, 3).join(', ')}`, 'bad');

  let nextTeams = winners;
  if (isUclNewFormat(d.settings) && currentRound === 'Knockout Playoff') nextTeams = [...directRoundOf16Teams(), ...winners];

  if (nextTeams.length < 1) return adminMessage('No advancing teams available. All ties may have been eliminated.', 'bad');
  if (nextTeams.length === 1) return adminMessage(`${nextTeams[0]} is the only remaining team. No next round can be generated.`, 'bad');

  if (d.matches.some((m) => m.round === nextRound) && !confirm(`${nextRound} already exists. Replace it and later rounds?`)) return;

  const keepRounds = d.matches.filter((m) => isLeaguePhaseMatch(m) || roundIndex(m.round) <= roundIndex(currentRound));
  const nextMatches = buildKnockoutRound(nextTeams, nextRound);
  setData({ matches: [...keepRounds, ...nextMatches] });
  showAdminTab('knockout');
  adminMessage(`${nextRound} generated${eliminated.length ? ` (${eliminated.length} eliminated tie(s) skipped)` : ''}.`, 'ok');
};

window.saveKnockoutDeadlines = () => {
  const d = data();
  const deadlines = { ...(d.settings.knockoutDeadlines || {}) };
  const rows = $$('[id^="koDeadlineDate_"]');
  for (const dateInput of rows) {
    const idx = dateInput.id.replace('koDeadlineDate_', '');
    const round = dateInput.dataset.round || '';
    const date = (dateInput.value || '').trim();
    const time = ($(`#koDeadlineTime_${idx}`)?.value || '').trim();
    if ((date && !time) || (!date && time)) return adminMessage(`Set both date and time for ${round}, or leave both blank.`, 'bad');
    if (date && time) deadlines[round] = { date, time };
    if (!date && !time) delete deadlines[round];
  }
  d.settings.knockoutDeadlines = deadlines;
  setData({ settings: d.settings });
  const changed = applyResultDeadlineDefaults();
  showAdminTab('knockout');
  adminMessage(changed > 0 ? `Deadlines saved. ${changed} knockout leg(s) were marked eliminated due missing results.` : 'Knockout deadlines saved.', 'ok');
};

window.saveKnockoutResults = () => {
  const d = data();
  const invalid = [];
  d.matches = d.matches.map((m) => {
    if (isLeaguePhaseMatch(m)) return m;
    if (m.autoEliminated || m.autoBye) return m;
    const hs = $(`#koHs_${m.id}`)?.value.trim() ?? m.homeScore;
    const as = $(`#koAs_${m.id}`)?.value.trim() ?? m.awayScore;
    if ((hs === '' && as !== '') || (hs !== '' && as === '')) {
      invalid.push(`${m.home} vs ${m.away}`);
      return m;
    }
    return { ...m, homeScore: hs, awayScore: as, autoDrawApplied: false, autoDrawAppliedAt: '', autoEliminated: false, autoEliminatedAt: '' };
  });
  if (invalid.length) return adminMessage(`Some knockout legs have only one score filled: ${invalid.slice(0, 3).join(', ')}`, 'bad');
  setData({ matches: d.matches });
  showAdminTab('knockout');
  adminMessage('Knockout results saved. Aggregate winners are calculated automatically.', 'ok');
};

window.applyDeadlineDrawsNow = () => {
  const changed = applyResultDeadlineDefaults();
  adminMessage(changed > 0 ? `${changed} due blank result(s) processed by deadline rules.` : 'No due blank results found.', 'ok');
};


// Deadline helper override for League Phase.
function matchDeadlinePassed(settings, match) {
  if (isLeaguePhaseMatch(match)) return isResultDeadlinePassed(settings);
  return isKnockoutDeadlinePassed(settings, match.round);
}

window.clearKnockoutFixtures = () => {
  if (!confirm('Clear all knockout fixtures, results, and schedules? League phase stays.')) return;
  const d = data();
  d.matches = d.matches.filter((m) => isLeaguePhaseMatch(m));
  setData({ matches: d.matches });
  showAdminTab('knockout');
  adminMessage('Knockout fixtures cleared. League phase was kept.', 'ok');
};

window.saveKnockoutSchedule = () => {
  const d = data();
  d.matches = d.matches.map((m) => {
    if (!isKnockoutMatch(m)) return m;
    return { ...m, date: $(`#koDate_${m.id}`)?.value || '', time: $(`#koTime_${m.id}`)?.value || '' };
  });
  setData({ matches: d.matches });
  showAdminTab('knockout');
  adminMessage('Knockout date/time saved.', 'ok');
};

/* =========================================================
   CLEAN UCL HOME + 2 LEG WORDING + TEAM LOGO UPLOAD UPGRADE
   Added by ChatGPT for EFL UCL website.
   ========================================================= */

function teamByName(name) {
  return (data().teams || []).find((t) => String(t.name).toLowerCase() === String(name).toLowerCase()) || null;
}

function teamLogoUrl(teamName) {
  const t = teamByName(teamName);
  return (t && t.logo) ? t.logo : '';
}

function teamLogoHtml(teamName, className = 'team-logo') {
  const logo = teamLogoUrl(teamName);
  const safeName = escapeHtml(teamName);
  if (logo) return `<img class="${className}" src="${escapeHtml(logo)}" alt="${safeName} logo">`;
  return `<div class="${className} logo-fallback">${escapeHtml(teamInitials(teamName))}</div>`;
}

function teamNameLogoHtml(teamName, className = 'team-name-logo') {
  return `<span class="${className}">${teamLogoHtml(teamName, 'team-logo-sm')}<b>${escapeHtml(teamName)}</b></span>`;
}

function renderHome() {
  applyResultDeadlineDefaults();
  init('home');
  const { teams, matches, settings } = data();
  const scoring = topScoringTeams();
  const leader = scoring[0];
  const upcoming = matches.filter((m) => m.homeScore === '' || m.awayScore === '').slice(0, 4);
  const completed = matches.filter(hasNumericScore).slice(-5).reverse();

  $('#app').innerHTML = `<section class="hero"><div class="wrap hero-grid"><div class="panel"><h1>${escapeHtml(tournamentName(settings))}</h1><a class="btn" href="fixtures.html">View Fixtures</a> <a class="btn alt" href="standings.html">View Standings</a><div class="stats"><div class="stat"><b>${teams.length}</b><br><span>Teams</span></div><div class="stat"><b>${settings.leaguePhaseMatchesPerTeam || 4}</b><br><span>League Matches / Team</span></div><div class="stat"><b>2 Leg</b><br><span>Knockout System</span></div></div></div><div class="panel"><h2>Upcoming Fixtures</h2>${upcoming.map((m) => matchCard(m)).join('') || '<p class="small">No upcoming fixtures yet.</p>'}</div></div></section><section class="section"><div class="wrap"><div class="title"><h2>Top Scoring Team</h2><a href="topscorers.html">View full list</a></div>${leader ? `<div class="topscorer-showcase"><div class="leader-card"><div class="leader-logo-wrap">${teamLogoHtml(leader.team, 'leader-logo')}</div><div class="leader-label">Leading team</div><h3>${escapeHtml(leader.team)}</h3><div class="leader-goals">${leader.GF}</div><p class="small">Goals scored</p></div><div class="card topscorer-side-list">${scoring.slice(0, 5).map((row) => `<div class="topscorer-item ${row.rank === 1 ? 'is-leading' : ''}"><div class="topscorer-rank">#${row.rank}</div><div class="topscorer-team with-logo">${teamNameLogoHtml(row.team)}<span class="small">P ${row.P} • GD ${row.GD}</span></div><div class="topscorer-goals">${row.GF}<span>goals</span></div></div>`).join('')}</div></div>` : '<div class="card"><p class="small">No top scoring data yet.</p></div>'}</div></section><section class="section"><div class="wrap"><div class="title"><h2>Latest Results</h2><a href="results.html">View all</a></div><div class="card">${completed.map((m) => matchCard(m)).join('') || '<p class="small">No results yet.</p>'}</div></div></section>`;
}

function renderTeams() {
  init('teams');
  const { teams, settings } = data();
  if (isUclNewFormat(settings)) {
    $('#app').innerHTML = `<section class="section"><div class="wrap"><div class="title"><h2>Teams</h2><span class="tag">${teams.length}/${settings.teamLimit || 24} teams</span></div><div class="grid">${teams.map((t, i) => `<div class="card team-card">${teamLogoHtml(t.name, 'team-card-logo')}<h3>${escapeHtml(t.name)}</h3><span class="tag">League Phase #${i + 1}</span></div>`).join('') || '<p>No teams yet.</p>'}</div></div></section>`;
    return;
  }

  const groups = [...new Set(teams.map((t) => t.group))].sort();
  $('#app').innerHTML = `<section class="section"><div class="wrap"><h2>Teams</h2>${groups.map((g) => `<h3 class="group-title">Group ${escapeHtml(g)}</h3><div class="grid">${teams.filter((t) => t.group === g).map((t) => `<div class="card team-card">${teamLogoHtml(t.name, 'team-card-logo')}<h3>${escapeHtml(t.name)}</h3><span class="tag">Group ${escapeHtml(t.group)}</span></div>`).join('')}</div>`).join('') || '<p>No teams yet.</p>'}</div></section>`;
}

function renderStandings() {
  applyResultDeadlineDefaults();
  init('standings');
  const { settings } = data();
  const rows = standings();

  if (isUclNewFormat(settings)) {
    $('#app').innerHTML = `<section class="section"><div class="wrap"><div class="title"><h2>League Phase Standings</h2><span class="tag">Top 8 direct • 9-24 playoff</span></div><div class="table-scroll"><table class="table standings-table"><tr><th>Rank</th><th>Team</th><th>Status</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>${rows.map((r, i) => `<tr><td><b>#${i + 1}</b></td><td>${teamNameLogoHtml(r.team)}</td><td>${rankLabel(i)}</td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF}</td><td>${r.GA}</td><td>${r.GD}</td><td><b>${r.Pts}</b></td></tr>`).join('')}</table></div></div></section>`;
    return;
  }

  const groups = [...new Set(rows.map((r) => r.group))];
  $('#app').innerHTML = `<section class="section"><div class="wrap"><h2>Group Standings</h2>${groups.map((g) => `<h3 class="group-title">Group ${escapeHtml(g)}</h3><table class="table standings-table"><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>${rows.filter((r) => r.group === g).map((r) => `<tr><td>${teamNameLogoHtml(r.team)}</td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF}</td><td>${r.GA}</td><td>${r.GD}</td><td><b>${r.Pts}</b></td></tr>`).join('')}</table>`).join('') || '<p>No standings yet.</p>'}</div></section>`;
}

function renderTopScorers() {
  applyResultDeadlineDefaults();
  init('topscorers');
  const rows = topScoringTeams();
  const leader = rows[0];
  if (!leader) {
    $('#app').innerHTML = `<section class="section"><div class="wrap"><div class="title"><h2>Top Scoring Teams</h2></div><div class="card"><p class="small">No teams yet.</p></div></div></section>`;
    return;
  }

  $('#app').innerHTML = `<section class="section"><div class="wrap"><div class="title"><h2>Top Scoring Teams</h2><span class="tag">Goals from league phase and knockout</span></div><div class="topscorer-showcase"><div class="leader-card"><div class="leader-logo-wrap">${teamLogoHtml(leader.team, 'leader-logo')}</div><div class="leader-label">Leading team</div><div class="leader-rank">#${leader.rank}</div><h3>${escapeHtml(leader.team)}</h3><div class="leader-goals">${leader.GF}</div><p class="small">Goals scored</p><div class="leader-meta"><span class="tag">Matches: ${leader.P}</span><span class="tag">GD: ${leader.GD}</span></div></div><div class="card topscorer-side-list">${rows.slice(0, 5).map((row) => `<div class="topscorer-item ${row.rank === 1 ? 'is-leading' : ''}"><div class="topscorer-rank">#${row.rank}</div><div class="topscorer-team with-logo">${teamNameLogoHtml(row.team)}<span class="small">P ${row.P} • GD ${row.GD}</span></div><div class="topscorer-goals">${row.GF}<span>goals</span></div></div>`).join('')}</div></div><div class="table-scroll" style="margin-top:22px"><table class="table top-scorer-table"><tr><th>Rank</th><th>Team</th><th>Goals</th><th>Matches</th><th>GD</th><th>Pts</th></tr>${rows.map((row) => `<tr><td><b>#${row.rank}</b></td><td>${teamNameLogoHtml(row.team)}</td><td>${row.GF}</td><td>${row.P}</td><td>${row.GD}</td><td>${row.Pts}</td></tr>`).join('')}</table></div></div></section>`;
}

const eflOriginalShowAdminTab = showAdminTab;
function showAdminTab(tab) {
  if (tab !== 'teams') return eflOriginalShowAdminTab(tab);

  const c = $('#adminContent');
  const { teams, settings } = data();
  const groupedSummary = GROUPS.slice(0, settings.groupCount).map((g) => `${g}: ${teams.filter((t) => t.group === g).length}`).join(' • ');
  const groupCell = (t) => isUclNewFormat(settings)
    ? `<span class="tag">League Phase</span>`
    : `<select onchange="updateTeam(${t.id},'group',this.value)">${groupOptions(t.group, settings.groupCount)}</select>`;

  c.innerHTML = `<h2>Teams + Logo Upload</h2><div id="adminMessage"></div><div class="admin-tools"><div class="tool-card"><h3>Paste teams at once</h3><p class="small">Paste one team per line. You can upload team logos after creating the teams.</p><textarea id="bulkTeams" rows="10" placeholder="Example:\nDortmund\nWolve\nFrankfurt\nSpur"></textarea><div class="check-row"><label><input id="replaceTeams" type="checkbox" checked> Replace current teams</label><label><input id="autoFixtures" type="checkbox" checked> Generate fixtures after creating teams</label></div><button class="btn" onclick="bulkCreateTeams()">Create Teams Automatically</button><button class="btn alt" onclick="shuffleExistingTeams()">Shuffle Existing Teams</button></div><div class="tool-card"><h3>Single team add</h3><div class="form compact"><input id="teamName" placeholder="Team name"><select id="teamGroup" ${isUclNewFormat(settings) ? 'disabled' : ''}>${groupOptions('A', settings.groupCount)}</select><button class="btn" onclick="addTeam()">Add Team</button></div><hr><p class="small"><b>Current:</b> ${teams.length}/${settings.teamLimit || 24} teams</p><p class="small"><b>Mode:</b> ${isUclNewFormat(settings) ? 'UCL League Phase' : escapeHtml(groupedSummary || 'Group Stage')}</p><button class="btn danger" onclick="clearTeamsAndMatches()">Clear Teams + Fixtures</button></div></div><br><h3>Team List</h3><p class="small">Upload each team logo here. Logos are saved inside browser storage and will show on Teams, Standings and Top Scorers pages.</p><div class="table-scroll"><table class="table team-admin-table"><tr><th>Logo</th><th>Team</th><th>Group / Phase</th><th>Upload Logo</th><th>Action</th></tr>${teams.map((t) => `<tr><td>${teamLogoHtml(t.name, 'admin-team-logo')}</td><td><input value="${escapeHtml(t.name)}" onchange="updateTeam(${t.id},'name',this.value)"></td><td>${groupCell(t)}</td><td><input type="file" accept="image/*" onchange="handleTeamLogoUpload(${t.id}, this)"><br><button class="btn alt mini-btn" onclick="clearTeamLogo(${t.id})">Clear Logo</button></td><td><button onclick="deleteTeam(${t.id})">Delete</button></td></tr>`).join('') || '<tr><td colspan="5">No teams yet.</td></tr>'}</table></div>`;
}

window.handleTeamLogoUpload = (id, input) => {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return alert('Please choose an image file.');

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 180;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, size, size);
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (size - w) / 2;
      const y = (size - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      const logo = canvas.toDataURL('image/png');
      const d = data();
      d.teams = d.teams.map((t) => (t.id === id ? { ...t, logo } : t));
      setData({ teams: d.teams });
      showAdminTab('teams');
      adminMessage('Team logo uploaded.', 'ok');
    };
    img.onerror = () => alert('Could not read this image file.');
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
};

window.clearTeamLogo = (id) => {
  const d = data();
  d.teams = d.teams.map((t) => (t.id === id ? { ...t, logo: '' } : t));
  setData({ teams: d.teams });
  showAdminTab('teams');
  adminMessage('Team logo removed.', 'ok');
};
