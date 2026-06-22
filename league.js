let currentTournament = null;

async function renderFixtures() {
  const tournament = getCurrentTournament();
  if (!tournament || !tournament.matches) return;
  
  const container = document.getElementById("fixtureList");
  if (!container) return;
  container.innerHTML = "";
  
  const searchQuery = document
    .getElementById("fixtureSearchInput")
    ?.value
    ?.toLowerCase() || "";
  
  const currentRound = getCurrentRound();
  const maxRound = Math.max(
    ...tournament.matches.map(m => m.round || 1),
    1
  );
  
  const roundLabel = document.getElementById("roundLabel");
  if (roundLabel) {
    roundLabel.innerText =
      maxRound === 1 ? "" : `Round ${currentRound}/${maxRound}`;
  }
  
  let roundMatches = tournament.matches;
  
  if (!searchQuery && maxRound !== 1) {
    roundMatches = roundMatches.filter(
      m => (m.round || 1) === currentRound
    );
  }
  
  if (searchQuery) {
    roundMatches = roundMatches.filter(match =>
      match.home.toLowerCase().includes(searchQuery) ||
      match.away.toLowerCase().includes(searchQuery)
    );
  }
  
  if (roundMatches.length === 0) {
    container.innerHTML = searchQuery ?
      '<p class="emptyText">No matching fixtures found</p>' :
      '<p class="emptyText">No matches <br> Matches will appear here once you create Fixtures</p>';
    return;
  }
  
  roundMatches.forEach(match => {
    const div = document.createElement("div");
    div.className = `fixture-row ${match.played ? "played" : "not-played"}`;
    
    const homeLogoKey = tournament.teamLogos?.[match.home];
    const awayLogoKey = tournament.teamLogos?.[match.away];
    
    div.innerHTML = `
      <div class="fixture-label">League</div>
      
      <div class="fixture-row-content">
        <div class="fixture-teams-stack">
          <div class="team-row-item team-home-container">
            <div class="fixture-team-logo-placeholder">?</div>
            <span class="fixture-team-name">${match.home}</span>
          </div>
          
          <div class="team-row-item team-away-container">
            <div class="fixture-team-logo-placeholder">?</div>
            <span class="fixture-team-name">${match.away}</span>
          </div>
        </div>

        <div class="fixture-status-pane">
          ${match.played
            ? `
              <div class="score-stack">
                <span class="score-badge played">${match.homeGoals}</span>
                <span class="score-badge played">${match.awayGoals}</span>
              </div>
            `
            : `<span class="vs-text-alt">VS</span>`
          }
        </div>
      </div>
    `;

    if (homeLogoKey) {
      getLogoFromIndexedDB(homeLogoKey).then(base64Logo => {
        const homeRow = div.querySelector(".team-home-container");
        const placeholder = homeRow?.querySelector(".fixture-team-logo-placeholder");
        
        if (base64Logo && homeRow && placeholder) {
          const img = document.createElement("img");
          img.className = "fixture-team-logo";
          img.src = base64Logo;
          homeRow.replaceChild(img, placeholder);
        }
      }).catch(err => console.error("Error loading home logo:", err));
    }

    if (awayLogoKey) {
      getLogoFromIndexedDB(awayLogoKey).then(base64Logo => {
        const awayRow = div.querySelector(".team-away-container");
        const placeholder = awayRow?.querySelector(".fixture-team-logo-placeholder");
        
        if (base64Logo && awayRow && placeholder) {
          const img = document.createElement("img");
          img.className = "fixture-team-logo";
          img.src = base64Logo;
          awayRow.replaceChild(img, placeholder);
        }
      }).catch(err => console.error("Error loading away logo:", err));
    }

    div.style.cursor = "pointer";
    div.addEventListener("click", () => {
      if (typeof openLeagueRecorder === "function") {
        openLeagueRecorder(match);
      }
    });
    
    container.appendChild(div);
  });
}


function nextRound() {
  console.log("[nextRound] Called");
  
  const tournament = getCurrentTournament();
  console.log("[nextRound] Current tournament:", tournament);
  
  if (!tournament) {
    console.error("[nextRound] No tournament loaded.");
    return;
  }
  
  if (!tournament.matches || !tournament.matches.length) {
    console.error("[nextRound] Tournament has no matches:", tournament);
    return;
  }
  
  const rounds = tournament.matches.map(m => m.round || 1);
  const maxRound = Math.max(...rounds);
  let currentRound = tournament.currentRound || 1;
  
  console.log(`[nextRound] currentRound=${currentRound}, maxRound=${maxRound}`);
  
  if (currentRound < maxRound) {
    tournament.currentRound = currentRound + 1;
    console.log("[nextRound] Setting round to:", tournament.currentRound);
    
    updateTournament(tournament);
    renderFixtures();
    console.log("[nextRound] Done");
  } else {
    console.log("[nextRound] Already at max round");
  }
}

function prevRound() {
  console.log("[prevRound] Called");
  
  const tournament = getCurrentTournament();
  console.log("[prevRound] Current tournament:", tournament);
  
  if (!tournament) {
    console.error("[prevRound] No tournament loaded.");
    return;
  }
  
  if (!tournament.matches || !tournament.matches.length) {
    console.error("[prevRound] Tournament has no matches.");
    return;
  }
  
  let currentRound = tournament.currentRound || 1;
  console.log(`[prevRound] currentRound=${currentRound}`);
  
  if (currentRound > 1) {
    tournament.currentRound = currentRound - 1;
    console.log("[prevRound] Setting round to:", tournament.currentRound);
    
    updateTournament(tournament);
    renderFixtures();
    console.log("[prevRound] Done");
  } else {
    console.log("[prevRound] Already at round 1");
  }
}

function getCurrentRound() {
  const tournament = getCurrentTournament();
  return tournament?.currentRound || 1;
}

function setCurrentRound(round) {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  tournament.currentRound = round;
  updateTournament(tournament);
}





async function tournamentCreator() {
  const input = document.getElementById("tournamentNameInput");
  const formatInput = document.getElementById("tournamentFormatInput");
  const name = input.value.trim();
  
  if (!name) {
    showAlert("Enter tournament name");
    return;
  }
  
  const id = Date.now().toString();
  
  const newTournament = {
    id,
    name,
    format: formatInput.value,
    createdAt: Date.now(),
    teams: [],
    matches: [],
    table: [],
    groups: [],
    teamLogos: {},
    groupMatches: [],
    qualifiedTeams: [],
    knockoutMatches: [],
    settings: {
      knockoutSize: 0,
      teamsPerGroup: 0,
      qualifiersPerGroup: 0
    }
  };
  
  await saveTournament(newTournament);
  
  hideCreateTournament();
  showAlert("Tournament created!");
  
  input.value = "";
  
  if (typeof renderTournamentList === "function") {
    renderTournamentList();
  }
}







function deleteTeam(index) {
  const tournament = getCurrentTournament();
  if (!tournament) return;

  const teamName = tournament.teams[index];
  if (!teamName) return;

  
  showConfirmModal(
    `Delete ${teamName}?`,
    (isConfirmed) => {
    
      if (isConfirmed) {
        tournament.teams.splice(index, 1);
        tournament.table = tournament.table.filter(t => t.name !== teamName);
        tournament.matches = tournament.matches.filter(
          m => m.home !== teamName && m.away !== teamName
        );

        updateTournament(tournament);

        renderTeams();
        renderTable(getSortedTable(tournament.table));
        showActionModal("❌ Team Deleted", "delete");
      }
    }
  );
}









function toggleScreenshotMode() {
  document.querySelector('.table-wrapper').classList.toggle('screenshot-mode');
}




function shareFixtures() {
  const element = document.getElementById('fixtureScreenshotArea');
  const roundLabelEl = document.getElementById('roundLabel');
  
  const titleText = roundLabelEl ? roundLabelEl.textContent : 'Fixtures';
  const roundText = titleText.replace(/\s/g, '-');

  if (!element) {
    showAlert('Screenshot target area not found!');
    return;
  }

  html2canvas(element, {
    backgroundColor: '#0d1117',
    scale: 2,
    useCORS: true
  }).then(canvas => {
    canvas.toBlob(blob => {
      if (!blob) {
        show('Failed to process screenshot image.');
        return;
      }

      const file = new File([blob], `fixtures-${roundText}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: titleText,
          text: `Check out the latest ${titleText}!`
        }).catch(err => console.log('Share dismissed', err));
      } else {
        const link = document.createElement('a');
        link.download = `fixtures-${roundText}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }, 'image/png');
  }).catch(err => {
    console.error('Screenshot failed:', err);
    showAlert('Could not take screenshot');
  });
}




window.onload = function () {
  renderTournamentList();

  const tournament = getCurrentTournament();

  if (tournament?.table) {
    renderTable(getSortedTable(tournament.table));
    
  }
};





function goToFixturePage() {
  setActiveNav('fixturesBtn')
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  document.getElementById("tournamentPage").style.display = "block";
  document.getElementById("fixturePage").style.display = "block";
  document.getElementById("fixturePageHead").style.display = "block";
  document.getElementById("nav").style.display = "flex";
  renderFixtures();
}


function goToStatPage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  document.getElementById("tournamentPage").style.display = "block";
  document.getElementById("statPage").style.display = "block";
}



function goToTeamListPage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  document.getElementById("teamListPage").style.display = "block";
  document.getElementById("teamListPageHead").style.display = "block";
  document.getElementById("nav").style.display = "none";
  document.getElementById("cupPageHead").style.display = "none";
  renderTeams();
}








function goToTournamentPage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  document.getElementById("nav").style.display = "flex";
  document.getElementById("tourListPageHead").style.display = "none";

  hideAllPages();

  const page = document.getElementById("tournamentPage");
  if (page) page.style.display = "block";
 

  goToTablePage();
}



function goToListOfTournamentPage() {
  hideAllPages();
  
  document.getElementById("listOfTournamentPage").style.display = "block";
  document.getElementById("tourListPageHead").style.display = "block";
}




function goToTablePage() {
  toggleView('table')
  setActiveNav("standingsBtn");
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  document.getElementById("tournamentPage").style.display = "block";
  document.getElementById("cupPage").style.display = "none";
  document.getElementById("tablePage").style.display = "block";
  document.getElementById("tablePageHead").style.display = "block";
  document.getElementById("resultRecord").style.display = "none";
  document.getElementById("nav").style.display = "flex";
  showingForm = false;

document.getElementById("tableView").style.display = "block";
document.getElementById("formView").style.display = "none";

document.getElementById("formToggleBtn").innerHTML = `
  <span class="btn-icon">📈</span>
  <span class="btn-text">Form</span>
`;

  rebuildTableFromMatches();

  const tournament = getCurrentTournament();
  if (tournament) {
    renderTable(getSortedTable(tournament.table || []));
  }
}








async function renderTournamentList() {
  const container = document.getElementById("tournamentList");
  if (!container) return;
  
  container.innerHTML = `<p class="emptyText">Loading tournaments...</p>`;
  
  const tournaments = await getTournaments();
  
  container.innerHTML = "";
  
  if (!tournaments || tournaments.length === 0) {
    container.innerHTML = `
      <p class="emptyText">
        No tournaments created yet <br>
        Your tournament will appear here when you create one
      </p>
    `;
    return;
  }
  
  tournaments.forEach(tournament => {
    const div = document.createElement("div");
    div.className = "tournament-card";
    
    const isSelected =
      typeof selectedTournaments !== "undefined" &&
      selectedTournaments.includes(tournament.id);
    
    div.innerHTML = `
      ${(typeof exportMode !== "undefined" && exportMode) ? `
        <div class="check">
          ${isSelected ? "✔" : ""}
        </div>
      ` : ""}
      <div class="tournament-format">${tournament.format || "League"}</div>
      <h3>${tournament.name}</h3>
    `;
    
    let pressTimer = null;
    let wasLongPress = false;
    
    const startPress = () => {
      wasLongPress = false;
      
      pressTimer = setTimeout(() => {
        wasLongPress = true;
        
        if (typeof deleteTournament === "function") {
          deleteTournament(tournament.id);
        }
        
        if (navigator.vibrate) navigator.vibrate(50);
      }, 600);
    };
    
    const cancelPress = () => clearTimeout(pressTimer);
    
    div.addEventListener("click", () => {
      if (wasLongPress) return;
      
      if (typeof exportMode !== "undefined" && exportMode) {
        if (typeof toggleSelect === "function") toggleSelect(tournament.id);
      } else {
        if (typeof openTournament === "function") openTournament(tournament.id);
      }
    });
    
    div.addEventListener("touchstart", startPress);
    div.addEventListener("touchend", cancelPress);
    div.addEventListener("touchmove", cancelPress);
    
    div.addEventListener("mousedown", startPress);
    div.addEventListener("mouseup", cancelPress);
    div.addEventListener("mouseleave", cancelPress);
    
    container.appendChild(div);
  });
}



function renderTable(data = []) {
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  if (!Array.isArray(data) || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No table data</td></tr>`;
    return;
  }
  
  data.forEach((team, index) => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-row-index", index);
    
    const gd = team.gd ?? ((team.gf || 0) - (team.ga || 0));
    const gdClass = gd < 0 ? 'neg' : '';
    
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <div class="table-team-cell">
          <strong>${team.name || ''}</strong>
        </div>
      </td>
      <td>${team.played || 0}</td>
      <td>${team.wins || 0}</td>
      <td>${team.draws || 0}</td>
      <td>${team.losses || 0}</td>
      <td>${team.gf || 0}</td>
      <td>${team.ga || 0}</td>
      <td class="${gdClass}">${gd >= 0 ? '+' + gd : gd}</td>
      <td><strong>${team.pts || 0}</strong></td>  <!-- ✅ FIXED -->
    `;
    
    tbody.appendChild(tr);
  });
}




function rebuildTableFromMatches() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const table = {};
  
  
  tournament.teams.forEach(team => {
    table[team] = {
      name: team,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0
    };
  });
  
  
  tournament.matches.forEach(match => {
    if (!match.played) return;
    
    const home = table[match.home];
    const away = table[match.away];
    if (!home || !away) return;
    
    const hg = Number(match.homeGoals ?? 0);
    const ag = Number(match.awayGoals ?? 0);
    
    home.played++;
    away.played++;
    
    home.gf += hg;
    home.ga += ag;
    
    away.gf += ag;
    away.ga += hg;
    
    if (hg > ag) {
      home.wins++;
      home.pts += 3;
      away.losses++;
    } else if (ag > hg) {
      away.wins++;
      away.pts += 3;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
      home.pts += 1;
      away.pts += 1;
    }
  });
  
  
  Object.values(table).forEach(team => {
    team.gd = team.gf - team.ga;
  });
  
  tournament.table = Object.values(table);
  updateTournament(tournament);
  
  if (typeof renderTable === "function") {
    renderTable(tournament.table);
  }
}





function setMatchResult(home, away, hg, ag) {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const match = tournament.matches.find(
    m => m.home === home && m.away === away
  );
  
  if (!match) return;
  
  
  match.homeGoals = hg;
  match.awayGoals = ag;
  match.played = true;
  
  
  updateTournament(tournament);
  
  
  rebuildTableFromMatches();
  
  const updatedTournament = getCurrentTournament();
  
  renderFixtures();
  renderCupFixtures();
  renderCupTables();
  renderTable(getSortedTable(updatedTournament.table));
  checkForEndOfGroupstage();
  
  showActionModal("✅ Result Saved", "success");
}


function handleSetScore() {
  const home = document.getElementById("homeTeam").textContent.trim();
  const away = document.getElementById("awayTeam").textContent.trim();
  
  const hg = parseInt(document.getElementById("homeGoals").value);
  const ag = parseInt(document.getElementById("awayGoals").value);
  
  if (!home || !away || home === away || isNaN(hg) || isNaN(ag)) {
    showAlert("Invalid Team or Score input");
    return;
  }
  
  setMatchResult(home, away, hg, ag);
  closeResultRecord();
}






























function deleteFixtures(force = false) {
  const tournament = getCurrentTournament();
  if (!tournament) return;


  if (!force && !confirm("Delete all fixtures and match results for this tournament?")) {
    return;
  }

  tournament.matches = [];
  tournament.table = []; 

  updateTournament(tournament);
  
  renderFixtures();
  renderTable([]);
  renderFormView();
  
  showActionModal("❌ fixture deleted", "delete");
}



function generateFixtures(rounds) {
  const tournament = getCurrentTournament();
  if (!tournament) return;

  const teams = tournament.teams;
  if (teams.length < 2) {
    showAlert("Add at least 2 teams first");
    return;
  }

  let matches = [];
  let teamList = [...teams];

  const hasBye = teamList.length % 2 !== 0;
  if (hasBye) teamList.push("BYE");

  const numTeams = teamList.length;
  const numRounds = numTeams - 1;
  const halfSize = numTeams / 2;

  for (let round = 0; round < numRounds; round++) {
    for (let i = 0; i < halfSize; i++) {
      const home = teamList[i];
      const away = teamList[numTeams - 1 - i];

      if (home !== "BYE" && away !== "BYE") {
        matches.push({
          home: home,
          away: away,
          homeGoals: null,
          awayGoals: null,
          played: false,
          round: round + 1
        });
      }
    }
    teamList.splice(1, 0, teamList.pop());
  }

  if (rounds === 2) {
    const returnLegs = matches.map(m => ({
      ...m,
      home: m.away,
      away: m.home,
      round: m.round + numRounds
    }));
    matches = [...matches, ...returnLegs];
  }

  tournament.matches = matches;
  
  tournament.records = {
    bestAttack: [],
    bestDefense: [],
    goalDifference: [],
    mostWins: [],
    biggestWins: [],
    highestScoringMatches: [],
    longestWinningRuns: [],
    longestUnbeatenRuns: []
  };

  tournament.table = teams.map(name => ({
    name, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0
  }));

  setCurrentRound(1);
  updateTournament(tournament);
  renderRecords();
}



function generateFixtures(rounds) {
  const tournament = getCurrentTournament();
  if (!tournament) return;

  const teams = tournament.teams;
  if (teams.length < 2) {
   showAlert("Add at least 2 teams first");
    return;
  }

  let matches = [];
  let teamList = [...teams];

  const hasBye = teamList.length % 2 !== 0;
  if (hasBye) teamList.push("BYE");

  const numTeams = teamList.length;
  const numRounds = numTeams - 1;
  const halfSize = numTeams / 2;

  for (let round = 0; round < numRounds; round++) {
    for (let i = 0; i < halfSize; i++) {
      const home = teamList[i];
      const away = teamList[numTeams - 1 - i];

      if (home !== "BYE" && away !== "BYE") {
        matches.push({
          home: home,
          away: away,
          homeGoals: null,
          awayGoals: null,
          played: false,
          round: round + 1
        });
      }
    }
    teamList.splice(1, 0, teamList.pop());
  }

  if (rounds === 2) {
    const returnLegs = matches.map(m => ({
      ...m,
      home: m.away,
      away: m.home,
      round: m.round + numRounds
    }));
    matches = [...matches, ...returnLegs];
  }

  tournament.matches = matches;
  tournament.table = teams.map(name => ({
    name, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0
  }));

  setCurrentRound(1);
  updateTournament(tournament);
  showAlert("Fixture Created")
}



function resetLogoUI() {
  const logoInput = document.getElementById("teamLogoInput");
  const logoPreview = document.getElementById("teamLogoPreview");
  
  logoInput.value = null;
  
  logoPreview.src = "";
  logoPreview.removeAttribute("src");
  logoPreview.classList.remove("show");
}










function getTeamForm(teamName, limit = 5) {
  const tournament = getCurrentTournament();
  if (!tournament?.matches) return [];
  
  const playedMatches = tournament.matches
    .filter(match =>
      match.played &&
      (match.home === teamName || match.away === teamName)
    );
  
  return playedMatches
    .slice(-limit)
    .reverse()
    .map(match => {
      const isHome = match.home === teamName;
      
      const goalsFor = isHome ?
        match.homeGoals :
        match.awayGoals;
      
      const goalsAgainst = isHome ?
        match.awayGoals :
        match.homeGoals;
      
      if (goalsFor > goalsAgainst) return "W";
      if (goalsFor < goalsAgainst) return "L";
      return "D";
    });
}


function renderFormView() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const container = document.getElementById("formContainer");
  if (!container) return;
  
  container.innerHTML = "";
  
  const sortedTable = getSortedTable(
    [...(tournament.table || [])]
  );
  
  sortedTable.forEach((tableRow, index) => {
    const teamName = tableRow.name;
    const form = getTeamForm(teamName);
    const logoKey = tournament.teamLogos?.[teamName];
    
    const row = document.createElement("div");
    row.className = "form-row";
    row.setAttribute("data-index", index);
    
    row.innerHTML = `
      <div class="form-team">
        <span class="form-position">
          ${index + 1}
        </span>
        <div class="team-logo-placeholder">⚽</div>
        <span>${teamName}</span>
      </div>

      <div class="form-results">
        ${form.map(result => `
          <span class="form-badge ${result}">
            ${result}
          </span>
        `).join("")}
      </div>
    `;
    
    if (logoKey) {
      getLogoFromIndexedDB(logoKey).then(base64Logo => {
        const teamSide = row.querySelector(".form-team");
        const placeholder = teamSide?.querySelector(".team-logo-placeholder");
        if (base64Logo && teamSide && placeholder) {
          const img = document.createElement("img");
          img.className = "team-logo";
          img.src = base64Logo;
          teamSide.replaceChild(img, placeholder);
        }
      }).catch(err => console.error("Error loading form view logo:", err));
    }
    
    container.appendChild(row);
  });
}

function getSortedTable(table) {
  return [...table].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;

    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;

    return gdB - gdA;
  });
}



function getPlayedMatches(matches) {
  return matches.filter(
    m =>
    m.played &&
    m.homeGoals !== null &&
    m.awayGoals !== null
  );
}



function getRecords(matches) {
  return {
    bestAttack: getBestAttack(matches),
    bestDefense: getBestDefense(matches),
    goalDifference: getGoalDifference(matches),
    mostWins: getMostWins(matches),
    
    biggestWins: getBiggestWins(matches),
    highestScoringMatches: getHighestScoringMatches(matches),
    mostGoalsInMatch: getMostGoalsInMatch(matches),
    
    longestWinningRuns: getLongestWinningRuns(matches),
    longestUnbeatenRuns: getLongestUnbeatenRuns(matches)
  };
}

function getBestAttack(matches) {
  const playedMatches = getPlayedMatches(matches);
  
  const goals = {};
  
  playedMatches.forEach(m => {
    goals[m.home] = (goals[m.home] || 0) + m.homeGoals;
    goals[m.away] = (goals[m.away] || 0) + m.awayGoals;
  });
  
  return Object.entries(goals)
    .sort((a, b) => b[1] - a[1]);
}


function getBestDefense(matches) {
  const conceded = {};
  
  matches.forEach(m => {
    conceded[m.home] = (conceded[m.home] || 0) + m.awayGoals;
    conceded[m.away] = (conceded[m.away] || 0) + m.homeGoals;
  });
  
  return Object.entries(conceded)
    .sort((a, b) => a[1] - b[1]);
}



function getGoalDifference(matches) {
  const gd = {};
  
  matches.forEach(m => {
    gd[m.home] = (gd[m.home] || 0) + (m.homeGoals - m.awayGoals);
    gd[m.away] = (gd[m.away] || 0) + (m.awayGoals - m.homeGoals);
  });
  
  return Object.entries(gd)
    .sort((a, b) => b[1] - a[1]);
}

function getMostWins(matches) {
  const playedMatches = matches.filter(
    m => m.played
  );
  
  const wins = {};
  
  playedMatches.forEach(m => {
    if (m.homeGoals > m.awayGoals) {
      wins[m.home] = (wins[m.home] || 0) + 1;
    } else if (m.awayGoals > m.homeGoals) {
      wins[m.away] = (wins[m.away] || 0) + 1;
    }
  });
  
  return Object.entries(wins)
    .sort((a, b) => b[1] - a[1]);
}



function getBiggestWins(matches) {
  return getPlayedMatches(matches)
    .map(match => ({
      ...match,
      margin: Math.abs(
        match.homeGoals - match.awayGoals
      )
    }))
    .sort((a, b) => b.margin - a.margin);
}


function getHighestScoringMatches(matches) {
  return getPlayedMatches(matches)
    .map(m => ({
      ...m,
      totalGoals: m.homeGoals + m.awayGoals
    }))
    .sort((a, b) => b.totalGoals - a.totalGoals);
}



function getMostGoalsInMatch(matches) {
  return getHighestScoringMatches(matches);
}

function getLongestWinningRuns(matches) {
  const playedMatches = getPlayedMatches(matches);
  
  const streaks = {};
  
  playedMatches.forEach(m => {
    [m.home, m.away].forEach(team => {
      if (!streaks[team]) {
        streaks[team] = { current: 0, best: 0 };
      }
    });
    
    if (m.homeGoals > m.awayGoals) {
      streaks[m.home].current++;
      streaks[m.away].current = 0;
    } else if (m.awayGoals > m.homeGoals) {
      streaks[m.away].current++;
      streaks[m.home].current = 0;
    } else {
      streaks[m.home].current = 0;
      streaks[m.away].current = 0;
    }
    
    streaks[m.home].best = Math.max(
      streaks[m.home].best,
      streaks[m.home].current
    );
    
    streaks[m.away].best = Math.max(
      streaks[m.away].best,
      streaks[m.away].current
    );
  });
  
  return Object.entries(streaks)
    .map(([team, data]) => [team, data.best])
    .sort((a, b) => b[1] - a[1]);
}


function getLongestUnbeatenRuns(matches) {
  const playedMatches = getPlayedMatches(matches);
  
  const streaks = {};
  
  playedMatches.forEach(m => {
    [m.home, m.away].forEach(team => {
      if (!streaks[team]) {
        streaks[team] = { current: 0, best: 0 };
      }
    });
    
    if (m.homeGoals >= m.awayGoals) {
      streaks[m.home].current++;
    } else {
      streaks[m.home].current = 0;
    }
    
    if (m.awayGoals >= m.homeGoals) {
      streaks[m.away].current++;
    } else {
      streaks[m.away].current = 0;
    }
    
    streaks[m.home].best = Math.max(
      streaks[m.home].best,
      streaks[m.home].current
    );
    
    streaks[m.away].best = Math.max(
      streaks[m.away].best,
      streaks[m.away].current
    );
  });
  
  return Object.entries(streaks)
    .map(([team, data]) => [team, data.best])
    .sort((a, b) => b[1] - a[1]);
}



function renderRecords() {
  const tournament = getCurrentTournament();
  if (!tournament || !tournament.matches) return;
  
  renderChampionPodium();
  const records = getRecords(tournament.matches);
  
  renderTop5("bestAttack", records.bestAttack, "⚽ Top Scorers", "goals");
  
  renderTop5(
    "bestDefense",
    records.bestDefense,
    "🛡 Best Defensive Teams",
    "conceded"
  );
  
  renderTop5(
    "goalDifference",
    records.goalDifference,
    "📈 Best Goal Difference"
  );
  
  renderTop5(
    "mostWins",
    records.mostWins,
    "👑 Most Wins",
    "wins"
  );
  
  renderMatchCard(
    "biggestWin",
    records.biggestWins[0],
    "💥 Biggest Win",
    `Margin: +${records.biggestWins[0]?.margin || 0}`
  );
  
  renderMatchCard(
    "highestScoringMatch",
    records.highestScoringMatches[0],
    "🔥 Highest Scoring Match",
    `Total Goals: ${records.highestScoringMatches[0]?.totalGoals || 0}`
  );
  
  renderStreakCard(
    "longestWinningRun",
    records.longestWinningRuns,
    "👑 Longest Winning Run",
    "wins"
  );
  
  renderStreakCard(
    "longestUnbeatenRun",
    records.longestUnbeatenRuns,
    "🚧 Longest Unbeaten Run",
    "matches"
  );
}

function renderTop5(containerId, dataArray, title, suffix = "") {
  const el = document.getElementById(containerId);
  if (!el || !dataArray) return;

  const tournament = getCurrentTournament();
  const top5 = dataArray.slice(0, 5);
  
  let rowsHtml = "";
  
  top5.forEach((item, index) => {
    let teamName = "";
    let value = 0;
    
    if (Array.isArray(item)) {
      [teamName, value] = item;
    } else if (item && typeof item === "object") {
      teamName = item.team || item.name;
      value = item[suffix] !== undefined ? item[suffix] : item.value;
    }
    
    if (!teamName) return;
    
    rowsHtml += `
      <div class="top5-row item-index-${index}" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <div class="team-side" style="display: flex; align-items: center; gap: 8px;">
          <span class="rank-number" style="font-weight: bold; min-width: 16px;">${index + 1}.</span>
          <div class="team-logo-placeholder">?</div>
          <span>${teamName}</span>
        </div>
        <div class="record-value" style="font-weight: bold;">
          ${value} <span style="font-size: 0.85em; font-weight: normal; color: var(--text-muted);">${suffix}</span>
        </div>
      </div>
    `;
  });

  el.innerHTML = `
    <div class="record-card top5-card">
      <div class="record-title" style="margin-bottom: 10px; font-weight: bold;">${title}</div>
      <div class="top5-list">
        ${rowsHtml}
      </div>
    </div>
  `;

  top5.forEach((item, index) => {
    let teamName = Array.isArray(item) ? item[0] : (item?.team || item?.name);
    if (!teamName) return;

    const logoKey = tournament.teamLogos?.[teamName];

    if (logoKey) {
      getLogoFromIndexedDB(logoKey).then(base64Logo => {
        const rowNode = el.querySelector(`.item-index-${index} .team-side`);
        const placeholder = rowNode?.querySelector(".team-logo-placeholder");
        if (base64Logo && rowNode && placeholder) {
          const img = document.createElement("img");
          img.className = "team-logo";
          img.src = base64Logo;
          img.style.width = "20px";
          img.style.height = "20px";
          img.style.objectFit = "contain";
          rowNode.replaceChild(img, placeholder);
        }
      }).catch(err => console.error("Error loading top 5 row logo:", err));
    }
  });
}

function renderMatchCard(containerId, match, title, extraLabel = "") {
  const el = document.getElementById(containerId);
  if (!el || !match) return;
  
  const tournament = getCurrentTournament();
  
  const homeLogoKey = tournament.teamLogos?.[match.home];
  const awayLogoKey = tournament.teamLogos?.[match.away];
  
  el.innerHTML = `
    <div class="record-card hero">
      <div class="record-title">${title}</div>

      <div class="match-vertical">

        <div class="team-row card-home-container">
          <div class="team-side">
            <div class="team-logo-placeholder">?</div>
            <span>${match.home}</span>
          </div>

          <div class="team-score">
            <b>${match.homeGoals}</b>
          </div>
        </div>

        <div class="team-row card-away-container">
          <div class="team-side">
            <div class="team-logo-placeholder">?</div>
            <span>${match.away}</span>
          </div>

          <div class="team-score">
            <b>${match.awayGoals}</b>
          </div>
        </div>

        <div class="record-sub center">
          ${extraLabel}
        </div>

      </div>
    </div>
  `;

  if (homeLogoKey) {
    getLogoFromIndexedDB(homeLogoKey).then(base64Logo => {
      const homeRow = el.querySelector(".card-home-container .team-side");
      const placeholder = homeRow?.querySelector(".team-logo-placeholder");
      if (base64Logo && homeRow && placeholder) {
        const img = document.createElement("img");
        img.className = "team-logo";
        img.src = base64Logo;
        homeRow.replaceChild(img, placeholder);
      }
    }).catch(err => console.error("Error loading match card home logo:", err));
  }

  if (awayLogoKey) {
    getLogoFromIndexedDB(awayLogoKey).then(base64Logo => {
      const awayRow = el.querySelector(".card-away-container .team-side");
      const placeholder = awayRow?.querySelector(".team-logo-placeholder");
      if (base64Logo && awayRow && placeholder) {
        const img = document.createElement("img");
        img.className = "team-logo";
        img.src = base64Logo;
        awayRow.replaceChild(img, placeholder);
      }
    }).catch(err => console.error("Error loading match card away logo:", err));
  }
}

function renderStreakCard(containerId, dataArray, title, suffix = "") {
  const el = document.getElementById(containerId);
  if (!el || !dataArray) return;
  
  const tournament = getCurrentTournament();
  
  const normalizedData = Array.isArray(dataArray[0]) ? dataArray : [dataArray];
  const top3 = normalizedData.slice(0, 3);
  
  let rowsHtml = "";
  
  top3.forEach((data, index) => {
    if (!data || data.length < 2) return;
    const [team, value] = data;
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
    
    rowsHtml += `
      <div class="streak-row streak-row-item-${index}" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div class="team-side" style="display: flex; align-items: center; gap: 8px;">
          <span class="medal">${medal}</span>
          <div class="team-logo-placeholder">?</div>
          <span>${team}</span>
        </div>
        <div class="record-sub">
          <b>${value}</b> ${suffix}
        </div>
      </div>
    `;
  });

  el.innerHTML = `
    <div class="record-card hero streak-card">
      <div class="record-title" style="margin-bottom: 12px; font-weight: bold;">${title}</div>
      <div class="streak-list">
        ${rowsHtml}
      </div>
    </div>
  `;

  top3.forEach((data, index) => {
    if (!data || data.length < 2) return;
    const [team] = data;
    const logoKey = tournament.teamLogos?.[team];

    if (logoKey) {
      getLogoFromIndexedDB(logoKey).then(base64Logo => {
        const rowNode = el.querySelector(`.streak-row-item-${index} .team-side`);
        const placeholder = rowNode?.querySelector(".team-logo-placeholder");
        if (base64Logo && rowNode && placeholder) {
          const img = document.createElement("img");
          img.className = "team-logo";
          img.src = base64Logo;
          img.style.width = "24px";
          img.style.height = "24px";
          img.style.objectFit = "contain";
          rowNode.replaceChild(img, placeholder);
        }
      }).catch(err => console.error("Error loading streak row logo:", err));
    }
  });
}











function getLeagueWinnerFinal() {
  const tournament = getCurrentTournament();
  if (!tournament) return null;
  
  const teams = tournament.teams || [];
  const matches = tournament.matches || [];
  const table = {};
  
  // FIXED: Properly populating the table object by team name key
  teams.forEach(team => {
    table[team] = {
      name: team,
      p: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      pts: 0,
      remaining: 0
    };
  });
  
  let allPlayed = true;
  
  matches.forEach(match => {
    if (!match) return;
    if (!table[match.home] || !table[match.away]) return;
    
    if (!match.played) {
      allPlayed = false;
      table[match.home].remaining++;
      table[match.away].remaining++;
    } else {
      const hg = Number(match.homeGoals ?? match.homeScore ?? 0);
      const ag = Number(match.awayGoals ?? match.awayScore ?? 0);
      
      const home = table[match.home];
      const away = table[match.away];
      
      home.p++;
      away.p++;
      home.gf += hg;
      home.ga += ag;
      away.gf += ag;
      away.ga += hg;
      
      if (hg > ag) {
        home.w++;
        home.pts += 3;
        away.l++;
      } else if (ag > hg) {
        away.w++;
        away.pts += 3;
        home.l++;
      } else {
        home.d++;
        away.d++;
        home.pts += 1;
        away.pts += 1;
      }
    }
  });
  
  const sorted = Object.values(table).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const gdB = b.gf - b.ga;
    const gdA = a.gf - a.ga;
    if (gdB !== gdA) return gdB - gdA;
    return b.gf - a.gf;
  });
  
  if (!sorted.length) return null;
  
  const leader = sorted[0];
  const second = sorted[1];
  const third = sorted[2];
  
  const allGamesPlayed = sorted.every(t => t.remaining === 0);
  if (allGamesPlayed) {
    return {
      team: leader.name,
      pts: leader.pts,
      gd: leader.gf - leader.ga,
      finished: true,
      decided: true
    };
  }
  
  if (second && third && leader.remaining === 0 && second.remaining === 0) {
    const thirdMax = third.pts + (third.remaining * 3);
    const top2MinPoints = Math.min(leader.pts, second.pts);
    
    if (thirdMax < top2MinPoints) {
      return {
        team: leader.name, 
        pts: leader.pts,
        gd: leader.gf - leader.ga,
        finished: false,
        decided: true
      };
    }
  }
  
  const winnerDecided = sorted.every(team => {
    if (team.name === leader.name) return true;
    const maxPossiblePoints = team.pts + (team.remaining * 3);
    return maxPossiblePoints < leader.pts;
  });
  
  if (!winnerDecided) {
    return {
      team: "TBD",
      pts: null,
      gd: null,
      finished: false,
      decided: false
    };
  }
  
  return {
    team: leader.name,
    pts: leader.pts,
    gd: leader.gf - leader.ga,
    finished: allPlayed,
    decided: true
  };
}


function renderChampionPodium() {
  const el = document.getElementById("championPodium");
  const tournament = getCurrentTournament();
  if (!el || !tournament) return;
  
  const winner = getLeagueWinnerFinal();
  if (!winner) return;
  
  const logoKey = tournament.teamLogos?.[winner.team];
  const tournamentLogo = tournament.logo || "";
  
  const isDecided = winner.decided && winner.team !== "TBD";
  
  
  el.innerHTML = `
    <div class="champion-card">

      <div class="champion-tournament-logo">
        ${tournamentLogo ? `<img src="${tournamentLogo}" class="tournament-logo">` : ""}
      </div>

      <div class="champion-title">
        🏆 ${isDecided ? "CHAMPION" : "WINNER TBD"}
      </div>

      <div class="champion-team-logo-wrap">
        <div class="team-logo-placeholder">?</div>
      </div>

      <div class="champion-name">
        ${winner.team}
      </div>

      ${isDecided 
        ? `<div class="champion-stats">${winner.pts} pts • GD ${winner.gd}</div>` 
        : `<div class="champion-stats">League in progress</div>`
      }

    </div>
  `;
  
  
  if (isDecided && logoKey) {
    getLogoFromIndexedDB(logoKey)
      .then(base64Logo => {
        const wrap = el.querySelector(".champion-team-logo-wrap");
        const placeholder = el.querySelector(".team-logo-placeholder");
        
        if (base64Logo && wrap && placeholder) {
          const img = document.createElement("img");
          img.className = "champion-team-logo";
          img.src = base64Logo;
          img.alt = winner.team;
          
          wrap.replaceChild(img, placeholder);
        }
      })
      .catch(err => console.error("Error loading champion logo:", err));
  }
}


