/*
  EFL Reliability Upgrade
  - Single-leg Final decision after penalties
  - Champion display in bracket
  - Team rename updates existing fixtures/results
  - Team shuffles and bulk imports preserve uploaded logos
  - Kept separate from app.js to make future maintenance safer
*/
(function () {
  const baseAggregateForTie = window.aggregateForTie;
  const baseShowAdminTab = window.showAdminTab;

  function finalDecisionForLegs(legs) {
    const finalMatch = (legs || []).find((m) => m && m.round === 'Final') || null;
    if (!finalMatch) return null;
    return {
      winner: finalMatch.decidedWinner || '',
      penaltyHomeScore: finalMatch.penaltyHomeScore ?? '',
      penaltyAwayScore: finalMatch.penaltyAwayScore ?? '',
      match: finalMatch
    };
  }

  window.aggregateForTie = aggregateForTie = function (legs) {
    const result = baseAggregateForTie(legs);
    const decision = finalDecisionForLegs(legs);

    if (
      decision &&
      result.complete &&
      !result.eliminated &&
      result.aGoals === result.bGoals &&
      (decision.winner === result.a || decision.winner === result.b)
    ) {
      result.winner = decision.winner;
      result.decidedBy = 'penalties';
      result.penaltyHomeScore = decision.penaltyHomeScore;
      result.penaltyAwayScore = decision.penaltyAwayScore;
    }

    return result;
  };

  window.knockoutTieStatusHtml = knockoutTieStatusHtml = function (tie) {
    const agg = aggregateForTie(tie.legs);
    const singleLeg = tie.round === 'Final' || tie.legs.length === 1 || tie.legs.some((m) => m.singleLeg);
    const scoreLabel = singleLeg ? 'Final score' : 'Aggregate';
    const drawLabel = singleLeg ? 'Final draw' : 'Aggregate draw';

    if (agg.eliminated) return '<span class="tag elim-tag">Both eliminated</span>';

    if (agg.winner) {
      let extra = `<span class="small">${scoreLabel} ${agg.aGoals}-${agg.bGoals}</span>`;
      if (agg.decidedBy === 'penalties') {
        const hasPens = agg.penaltyHomeScore !== '' && agg.penaltyAwayScore !== '';
        extra += `<br><span class="small">Won after penalties${hasPens ? ` (${escapeHtml(agg.penaltyHomeScore)}-${escapeHtml(agg.penaltyAwayScore)})` : ''}</span>`;
      }
      return `<span class="tag">Winner: ${escapeHtml(agg.winner)}</span><br>${extra}`;
    }

    if (agg.complete && agg.aGoals === agg.bGoals) {
      return `<span class="tag draw-tag">${drawLabel}</span><br><span class="small">Select the winner after penalties in Admin.</span>`;
    }

    return '<span class="small">Pending</span>';
  };

  function finalDecisionControlsHtml(tie) {
    const match = tie.legs[0];
    const selected = match.decidedWinner || '';
    const homePen = match.penaltyHomeScore ?? '';
    const awayPen = match.penaltyAwayScore ?? '';

    return `<div class="final-decision-controls">
      <label>Deciding winner
        <select id="finalWinner_${match.id}">
          <option value="">Not decided</option>
          <option value="${escapeHtml(tie.tieHome)}" ${selected === tie.tieHome ? 'selected' : ''}>${escapeHtml(tie.tieHome)}</option>
          <option value="${escapeHtml(tie.tieAway)}" ${selected === tie.tieAway ? 'selected' : ''}>${escapeHtml(tie.tieAway)}</option>
        </select>
      </label>
      <div class="penalty-inputs">
        <label>Pen. ${escapeHtml(tie.tieHome)} <input id="finalPenHome_${match.id}" type="number" min="0" inputmode="numeric" value="${escapeHtml(homePen)}"></label>
        <label>Pen. ${escapeHtml(tie.tieAway)} <input id="finalPenAway_${match.id}" type="number" min="0" inputmode="numeric" value="${escapeHtml(awayPen)}"></label>
      </div>
      <span class="small">Used only when the Final score is level.</span>
    </div>`;
  }

  function enhanceFinalAdminControls() {
    const finalTies = groupKnockoutTies(data().matches.filter((m) => m.round === 'Final'));
    finalTies.forEach((tie) => {
      const match = tie.legs[0];
      const scoreInput = document.querySelector(`#koHs_${match.id}`);
      const row = scoreInput && scoreInput.closest('tr');
      const statusCell = row && row.lastElementChild;
      if (!statusCell || statusCell.querySelector('.final-decision-controls')) return;
      statusCell.insertAdjacentHTML('beforeend', finalDecisionControlsHtml(tie));
    });
  }

  window.showAdminTab = showAdminTab = function (tab) {
    baseShowAdminTab(tab);
    if (tab === 'knockout') enhanceFinalAdminControls();
  };

  window.saveKnockoutResults = function () {
    const d = data();
    const invalid = [];
    const decisionErrors = [];

    d.matches = d.matches.map((m) => {
      if (isLeaguePhaseMatch(m)) return m;
      if (m.autoEliminated || m.autoBye) return m;

      const hs = document.querySelector(`#koHs_${m.id}`)?.value.trim() ?? m.homeScore;
      const as = document.querySelector(`#koAs_${m.id}`)?.value.trim() ?? m.awayScore;

      if ((hs === '' && as !== '') || (hs !== '' && as === '')) {
        invalid.push(`${m.home} vs ${m.away}`);
        return m;
      }

      const updated = {
        ...m,
        homeScore: hs,
        awayScore: as,
        autoDrawApplied: false,
        autoDrawAppliedAt: '',
        autoEliminated: false,
        autoEliminatedAt: ''
      };

      if (m.round !== 'Final') return updated;

      const winner = document.querySelector(`#finalWinner_${m.id}`)?.value || '';
      const penHome = document.querySelector(`#finalPenHome_${m.id}`)?.value.trim() ?? '';
      const penAway = document.querySelector(`#finalPenAway_${m.id}`)?.value.trim() ?? '';
      const complete = hs !== '' && as !== '';
      const drawn = complete && Number(hs) === Number(as);

      if ((penHome === '' && penAway !== '') || (penHome !== '' && penAway === '')) {
        decisionErrors.push('Enter both penalty scores or leave both blank.');
        return m;
      }

      if (!drawn) {
        updated.decidedWinner = '';
        updated.penaltyHomeScore = '';
        updated.penaltyAwayScore = '';
        return updated;
      }

      if (winner && winner !== m.home && winner !== m.away) {
        decisionErrors.push('The selected Final winner is invalid.');
        return m;
      }

      if (penHome !== '' && penAway !== '') {
        if (Number(penHome) === Number(penAway)) {
          decisionErrors.push('Penalty scores cannot finish level.');
          return m;
        }
        const penaltyWinner = Number(penHome) > Number(penAway) ? m.home : m.away;
        if (winner && winner !== penaltyWinner) {
          decisionErrors.push('Selected Final winner does not match the penalty score.');
          return m;
        }
        updated.decidedWinner = winner || penaltyWinner;
      } else {
        updated.decidedWinner = winner;
      }

      updated.penaltyHomeScore = penHome;
      updated.penaltyAwayScore = penAway;
      return updated;
    });

    if (invalid.length) return adminMessage(`Some knockout matches have only one score filled: ${invalid.slice(0, 3).join(', ')}`, 'bad');
    if (decisionErrors.length) return adminMessage(decisionErrors[0], 'bad');

    setData({ matches: d.matches });
    showAdminTab('knockout');

    const finalMatch = d.matches.find((m) => m.round === 'Final');
    const finalNeedsWinner = finalMatch && hasNumericScore(finalMatch) && Number(finalMatch.homeScore) === Number(finalMatch.awayScore) && !finalMatch.decidedWinner;
    adminMessage(finalNeedsWinner ? 'Scores saved. The drawn Final still needs a deciding winner.' : 'Knockout results saved successfully.', finalNeedsWinner ? 'bad' : 'ok');
  };

  window.renderBracket = renderBracket = function () {
    applyResultDeadlineDefaults();
    init('bracket');
    const d = data();
    const q = qualified();
    const kos = d.matches.filter((m) => isKnockoutMatch(m));
    const rounds = knockoutRoundListFromMatches(d.matches);
    const finalTie = groupKnockoutTies(kos.filter((m) => m.round === 'Final'))[0];
    const champion = finalTie ? aggregateForTie(finalTie.legs).winner : '';

    const championHtml = champion
      ? `<div class="champion-banner"><span>Champion</span><div>${teamLogoHtml(champion, 'champion-logo')}</div><h2>${escapeHtml(champion)}</h2></div>`
      : '';

    const bracketHtml = rounds.map((round) => {
      const ties = groupKnockoutTies(kos.filter((m) => m.round === round));
      return `<h3 class="group-title">${escapeHtml(round)}</h3><div class="bracket-tie-grid">${ties.map((tie) => `<div class="card bracket-tie"><div class="tie-head"><b>${escapeHtml(tie.tieHome)}</b><span>vs</span><b>${escapeHtml(tie.tieAway)}</b></div>${tie.legs.map((m) => matchCard(m)).join('')}<div class="tie-status">${knockoutTieStatusHtml(tie)}</div></div>`).join('')}</div>`;
    }).join('');

    document.querySelector('#app').innerHTML = `<section class="section"><div class="wrap"><h2>Knockout Bracket</h2><p class="small">Knockout rounds use 2-leg aggregate scoring through the Semi Finals. The Final is one match only and can be decided by penalties.</p>${championHtml}${bracketHtml || `<div class="card"><h3>Qualified / League Phase Teams</h3>${q.map((t) => `<div class="slot">${escapeHtml(t)}</div>`).join('') || '<p class="small">No qualified teams yet.</p>'}<p class="small">No knockout fixtures generated yet.</p></div>`}</div></section>`;
  };

  window.updateTeam = function (id, key, value) {
    const d = data();
    const current = d.teams.find((t) => t.id === id);
    if (!current) return;

    if (key !== 'name') {
      d.teams = d.teams.map((t) => t.id === id ? { ...t, [key]: value } : t);
      setData({ teams: d.teams });
      return;
    }

    const newName = String(value || '').trim();
    const oldName = current.name;
    if (!newName) {
      showAdminTab('teams');
      return adminMessage('Team name cannot be blank.', 'bad');
    }
    if (d.teams.some((t) => t.id !== id && t.name.toLowerCase() === newName.toLowerCase())) {
      showAdminTab('teams');
      return adminMessage('Another team already uses that name.', 'bad');
    }

    d.teams = d.teams.map((t) => t.id === id ? { ...t, name: newName } : t);
    d.matches = d.matches.map((m) => ({
      ...m,
      home: m.home === oldName ? newName : m.home,
      away: m.away === oldName ? newName : m.away,
      tieHome: m.tieHome === oldName ? newName : m.tieHome,
      tieAway: m.tieAway === oldName ? newName : m.tieAway,
      decidedWinner: m.decidedWinner === oldName ? newName : m.decidedWinner
    }));

    setData({ teams: d.teams, matches: d.matches });
    showAdminTab('teams');
    adminMessage(`Team renamed to ${newName}. Existing fixtures and results were updated.`, 'ok');
  };

  window.shuffleExistingTeams = function () {
    const d = data();
    if (d.teams.length < 2) return adminMessage('Add at least 2 teams before shuffling.', 'bad');

    let teams;
    if (isUclNewFormat(d.settings)) {
      teams = shuffleArray(d.teams).map((team) => ({ ...team, group: 'League Phase' }));
    } else {
      const capacity = d.settings.groupCount * d.settings.teamsPerGroup;
      if (d.teams.length > capacity) return adminMessage(`You have ${d.teams.length} teams, but capacity is ${capacity}.`, 'bad');
      teams = createGroupedTeamsFromNames(d.teams.map((t) => t.name), d.settings, true, d.teams);
    }

    const matches = buildGroupFixtures(teams, d.settings);
    setData({ teams, matches });
    showAdminTab('teams');
    adminMessage('Teams shuffled, logos preserved, and fixtures regenerated.', 'ok');
  };

  window.bulkCreateTeams = function () {
    const d = data();
    const pasted = parseTeamNames(document.querySelector('#bulkTeams')?.value || '');
    const replace = Boolean(document.querySelector('#replaceTeams')?.checked);
    const autoFixtures = Boolean(document.querySelector('#autoFixtures')?.checked);

    if (!pasted.length) return adminMessage('Paste team names first.', 'bad');

    const names = replace
      ? pasted
      : parseTeamNames([...d.teams.map((t) => t.name), ...pasted].join('\n'));

    if (names.length > (d.settings.teamLimit || 24)) {
      return adminMessage(`You have ${names.length} teams. Maximum is ${d.settings.teamLimit || 24}.`, 'bad');
    }

    const existingByName = new Map(d.teams.map((t) => [t.name.toLowerCase(), t]));
    let teams;

    if (isUclNewFormat(d.settings)) {
      teams = names.map((name, index) => {
        const existing = existingByName.get(name.toLowerCase());
        return existing
          ? { ...existing, name, group: 'League Phase' }
          : { id: Date.now() + index, name, group: 'League Phase' };
      });
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
    adminMessage(`${teams.length} team(s) created. Existing team logos were preserved.`, 'ok');
  };
})();
