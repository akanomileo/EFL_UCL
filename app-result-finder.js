/*
  EFL Admin Result Finder Upgrade
  - Instant team/fixture search
  - Team, round and status filters
  - Pending-only default view
  - Clearer team names with logos in result entry
  - Works for League Results and Knockout Results
*/
(function () {
  const baseShowAdminTab = window.showAdminTab;

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function normal(value) {
    return text(value).toLowerCase();
  }

  function scoreIsSet(value) {
    return value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
  }

  function matchStatus(match) {
    if (match.autoEliminated) return 'eliminated';
    if (match.autoBye) return 'bye';
    if (scoreIsSet(match.homeScore) && scoreIsSet(match.awayScore)) return 'completed';
    return 'pending';
  }

  function statusLabel(status) {
    if (status === 'completed') return 'Completed';
    if (status === 'eliminated') return 'Eliminated';
    if (status === 'bye') return 'BYE';
    return 'Pending';
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function findKnockoutResultTable(content) {
    const cards = [...content.querySelectorAll('.tool-card')];
    const resultCard = cards.find((card) => normal(card.querySelector('h3')?.textContent) === 'knockout results');
    return resultCard ? resultCard.querySelector('table') : null;
  }

  function rowMatch(row, matches, kind) {
    const selector = kind === 'league' ? 'input[id^="hs_"]' : 'input[id^="koHs_"]';
    const input = row.querySelector(selector);
    if (!input) return null;
    const id = text(input.id).replace(kind === 'league' ? 'hs_' : 'koHs_', '');
    return matches.find((match) => String(match.id) === id) || null;
  }

  function enhanceMatchCell(row, match) {
    const cell = row.children[1];
    if (!cell || cell.dataset.finderMatchEnhanced === 'true') return;
    cell.dataset.finderMatchEnhanced = 'true';
    cell.innerHTML = `<div class="result-entry-match">
      <div class="result-entry-team">${teamLogoHtml(match.home, 'result-entry-logo')}<b>${escapeHtml(match.home)}</b></div>
      <span class="result-entry-vs">vs</span>
      <div class="result-entry-team">${teamLogoHtml(match.away, 'result-entry-logo')}<b>${escapeHtml(match.away)}</b></div>
    </div>`;
  }

  function finderHtml(kind, resultMatches) {
    const prefix = kind === 'league' ? 'league' : 'knockout';
    const teams = uniqueSorted(resultMatches.flatMap((match) => [match.home, match.away]));
    const rounds = uniqueSorted(resultMatches.map((match) => match.leaguePhaseRound ? `League Round ${match.leaguePhaseRound}` : (match.round || match.group || 'Other')));
    const pendingCount = resultMatches.filter((match) => matchStatus(match) === 'pending').length;
    const defaultStatus = pendingCount > 0 ? 'pending' : 'all';

    return `<div class="result-finder" data-kind="${prefix}">
      <div class="result-finder-heading">
        <div><h3>Find a fixture quickly</h3><p class="small">Search a team name or select a team. Only matching result rows will remain visible.</p></div>
        <div class="result-finder-count" id="${prefix}FinderCount">${resultMatches.length} fixtures</div>
      </div>
      <div class="result-finder-controls">
        <label class="result-search-field"><span>Search</span><input id="${prefix}ResultSearch" type="search" placeholder="Type a team or fixture name" autocomplete="off"></label>
        <label><span>Team</span><select id="${prefix}ResultTeam"><option value="">All teams</option>${teams.map((team) => `<option value="${escapeHtml(team)}">${escapeHtml(team)}</option>`).join('')}</select></label>
        <label><span>Round</span><select id="${prefix}ResultRound"><option value="">All rounds</option>${rounds.map((round) => `<option value="${escapeHtml(round)}">${escapeHtml(round)}</option>`).join('')}</select></label>
        <label><span>Status</span><select id="${prefix}ResultStatus"><option value="all" ${defaultStatus === 'all' ? 'selected' : ''}>All fixtures</option><option value="pending" ${defaultStatus === 'pending' ? 'selected' : ''}>Pending only (${pendingCount})</option><option value="completed">Completed only</option></select></label>
        <button class="btn alt result-filter-reset" id="${prefix}ResultReset" type="button">Reset</button>
      </div>
      <div class="result-finder-tip"><b>Tip:</b> Select one team to see every fixture involving that team.</div>
    </div>`;
  }

  function enhanceResultEntry(kind) {
    const content = document.querySelector('#adminContent');
    if (!content) return;

    const table = kind === 'league' ? content.querySelector('table.result-table') : findKnockoutResultTable(content);
    if (!table || table.dataset.resultFinderEnhanced === 'true') return;
    table.dataset.resultFinderEnhanced = 'true';

    const allMatches = data().matches || [];
    const rows = [...table.querySelectorAll('tr')].slice(1);
    const mappedRows = [];

    rows.forEach((row) => {
      const match = rowMatch(row, allMatches, kind);
      if (!match) return;
      const round = match.leaguePhaseRound ? `League Round ${match.leaguePhaseRound}` : (match.round || match.group || 'Other');
      const status = matchStatus(match);

      row.classList.add('admin-result-row');
      row.dataset.home = normal(match.home);
      row.dataset.away = normal(match.away);
      row.dataset.fixture = normal(`${match.home} ${match.away} ${round}`);
      row.dataset.round = round;
      row.dataset.status = status;
      enhanceMatchCell(row, match);
      mappedRows.push({ row, match, round, status });
    });

    if (!mappedRows.length) return;

    const resultMatches = mappedRows.map((item) => item.match);
    const tableScroll = table.closest('.table-scroll');
    if (!tableScroll) return;
    tableScroll.insertAdjacentHTML('beforebegin', finderHtml(kind, resultMatches));

    const prefix = kind === 'league' ? 'league' : 'knockout';
    const search = document.querySelector(`#${prefix}ResultSearch`);
    const team = document.querySelector(`#${prefix}ResultTeam`);
    const round = document.querySelector(`#${prefix}ResultRound`);
    const status = document.querySelector(`#${prefix}ResultStatus`);
    const count = document.querySelector(`#${prefix}FinderCount`);
    const reset = document.querySelector(`#${prefix}ResultReset`);

    const empty = document.createElement('div');
    empty.className = 'result-filter-empty';
    empty.hidden = true;
    empty.innerHTML = '<b>No matching fixtures.</b><span>Change the team, round, status, or search text.</span>';
    tableScroll.insertAdjacentElement('afterend', empty);

    function applyFilter() {
      const searchValue = normal(search?.value);
      const teamValue = normal(team?.value);
      const roundValue = text(round?.value);
      const statusValue = text(status?.value || 'all');
      let visible = 0;

      mappedRows.forEach((item) => {
        const searchMatch = !searchValue || item.row.dataset.fixture.includes(searchValue);
        const teamMatch = !teamValue || item.row.dataset.home === teamValue || item.row.dataset.away === teamValue;
        const roundMatch = !roundValue || item.round === roundValue;
        const statusMatch = statusValue === 'all' || item.status === statusValue;
        const show = searchMatch && teamMatch && roundMatch && statusMatch;
        item.row.hidden = !show;
        if (show) visible += 1;
      });

      if (count) count.textContent = `${visible} of ${mappedRows.length} fixtures`;
      empty.hidden = visible !== 0;
      tableScroll.classList.toggle('has-no-visible-results', visible === 0);
    }

    [search, team, round, status].forEach((control) => {
      if (!control) return;
      control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', applyFilter);
    });

    reset?.addEventListener('click', () => {
      if (search) search.value = '';
      if (team) team.value = '';
      if (round) round.value = '';
      if (status) status.value = 'all';
      applyFilter();
      search?.focus();
    });

    applyFilter();
  }

  window.showAdminTab = showAdminTab = function (tab) {
    baseShowAdminTab(tab);
    if (tab === 'results') enhanceResultEntry('league');
    if (tab === 'knockout') enhanceResultEntry('knockout');
  };
})();
