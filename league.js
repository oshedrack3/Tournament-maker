let currentTournament = null;


async function renderFixtures() {
    const tournament = await getCurrentTournament();
    if (!tournament || !tournament.matches) return;
    
    const container = document.getElementById("fixtureList");
    if (!container) return;
    container.innerHTML = "";
    
    const searchQuery = document
      .getElementById("fixtureSearchInput")
      ?.value
      ?.toLowerCase() || "";
    
    const currentRound = await getCurrentRound(); // <- add await
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
      );;
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
    
    const homeLogo = tournament.teamLogos?.[match.home];
    const awayLogo = tournament.teamLogos?.[match.away];
    
    div.innerHTML = `
      <div class="fixture-label">League</div>
      
      <div class="fixture-row-content">
        <div class="fixture-teams-stack">
          <div class="team-row-item">
            ${homeLogo 
              ? `<img class="fixture-team-logo" src="${homeLogo}">` 
              : `<div class="fixture-team-logo-placeholder">?</div>`
            }
            <span class="fixture-team-name">${match.home}</span>
          </div>
          
          <div class="team-row-item">
            ${awayLogo 
              ? `<img class="fixture-team-logo" src="${awayLogo}">` 
              : `<div class="fixture-team-logo-placeholder">?</div>`
            }
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

    div.style.cursor = "pointer";
    div.addEventListener("click", () => {
      if (typeof openLeagueRecorder === "function") {
        openLeagueRecorder(match);
      }
    });
    
    container.appendChild(div);
  });
}



async function nextRound() {
  console.log("[nextRound] Called");
  
  const tournament = await getCurrentTournament(); // <- add await
  console.log("[nextRound] Current tournament:", tournament);
  
  if (!tournament) {
    console.error("[nextRound] No tournament loaded. Call loadFromFirebase first.");
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
    
    await updateTournament(tournament);
    await renderFixtures();
    console.log("[nextRound] Done");
  } else {
    console.log("[nextRound] Already at max round");
  }
}

async function prevRound() {
  console.log("[prevRound] Called");
  
  const tournament = await getCurrentTournament(); // <- add await
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
    
    await updateTournament(tournament);
    await renderFixtures();
    console.log("[prevRound] Done");
  } else {
    console.log("[prevRound] Already at round 1");
  }
}



  




function tournamentCreator() {
  const input = document.getElementById("tournamentNameInput");
  const formatInput = document.getElementById("tournamentFormatInput");
  const name = input.value.trim();
  
  if (!name) {
    showAlert("Enter tournament name");
    return;
  }
  
 
  const tournaments = getTournaments();
  
  const id = Date.now();
  
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
  

  tournaments.push(newTournament);
  
  
  saveTournaments(tournaments);
  
  
  if (typeof updateTournament === "function") {
    updateTournament(newTournament);
  } else {
    localStorage.setItem("tournament", JSON.stringify(newTournament));
  }
  
  
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





async function rebuildTableFromMatches() {
  const tournament = await getCurrentTournament();
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
      points: 0
    };
  });

  tournament.matches.forEach(match => {
    if (!match.played) return;

    const home = table[match.home];
    const away = table[match.away];


    const hg = Number(match.homeGoals || 0);
    const ag = Number(match.awayGoals || 0);

    
    home.played++;
    away.played++;

    
    home.gf += hg;
    home.ga += ag;

    away.gf += ag;
    away.ga += hg;

   
    if (hg > ag) {
      home.wins++;
      home.points += 3;
      away.losses++;
    } else if (ag > hg) {
      away.wins++;
      away.points += 3;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
      home.points += 1;
      away.points += 1;
    }
  });

  tournament.table = Object.values(table);


  await updateTournament(tournament);
  
 
  if (typeof renderTable === "function") {
    renderTable(tournament.table);
  }
}




function getSortedTable(table) {
  return [...table].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;

    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;

    return gdB - gdA;
  });
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




function updateTournament(updatedTournament) {
  let tournaments = getTournaments();
  const index = tournaments.findIndex(t => String(t.id) === String(updatedTournament.id));

  if (index !== -1) {
    tournaments[index] = updatedTournament;
    saveTournaments(tournaments);
  }
}







// 1. Added async so this function can handle the live cloud download stream
async function renderTournamentList() {
  const container = document.getElementById("tournamentList");
  if (!container) return;
  
  container.innerHTML = "";
  
  // Show a quick loading state while waiting for Firestore to talk back
  container.innerHTML = `<p class="emptyText">Loading tournaments from cloud...</p>`;
  
  // 2. Added await here so it waits for the direct-from-Firestore list array
  const tournaments = await getTournaments();
  
  // Clear the temporary loading state
  container.innerHTML = "";
  
  if (!tournaments || tournaments.length === 0) {
    container.innerHTML = `
      <p class="emptyText">No tournaments created yet <br> Your tournament will appear here when you create one</p>
    `;
    return;
  }
  
  tournaments.forEach(tournament => {
    const div = document.createElement("div");
    div.className = "tournament-card";
    
    // Explicit array state check safeguard
    const isSelected = typeof selectedTournaments !== "undefined" && selectedTournaments.includes(tournament.id);
    
    div.innerHTML = `
      ${(typeof exportMode !== "undefined" && exportMode) ? `
        <div class="check">
          ${isSelected ? "✔" : ""}
        </div>
      ` : ""}
      <div class="tournament-format">${tournament.format || 'League'}</div>
      <h3>${tournament.name}</h3>
    `;
    
    let pressTimer = null;
    let wasLongPress = false;
    const longPressDuration = 600;
    
    const startPress = () => {
      wasLongPress = false;
      pressTimer = setTimeout(() => {
        wasLongPress = true;
        if (typeof deleteTournament === "function") {
          deleteTournament(tournament.id);
        }
        if (navigator.vibrate) navigator.vibrate(50);
      }, longPressDuration);
    };
    
    const cancelPress = () => clearTimeout(pressTimer);
    
    div.addEventListener("click", () => {
      // Guard clause to ignore standard clicks if a long-press delete action just fired
      if (wasLongPress) return; 

      if (typeof exportMode !== "undefined" && exportMode) {
        if (typeof toggleSelect === "function") toggleSelect(tournament.id);
      } else {
        if (typeof openTournament === "function") openTournament(tournament.id);
      }
    });
    
    // Touch event binders
    div.addEventListener("touchstart", startPress);
    div.addEventListener("touchend", cancelPress);
    div.addEventListener("touchmove", cancelPress);
    
    // Mouse fallback event binders
    div.addEventListener("mousedown", startPress);
    div.addEventListener("mouseup", cancelPress);
    div.addEventListener("mouseleave", cancelPress);
    
    container.appendChild(div);
  });
}




async function getCurrentRound() {
  const tournament = await getCurrentTournament(); // <- await here
  return tournament?.currentRound || 1;
}

async function setCurrentRound(round) {
  const tournament = await getCurrentTournament();
  if (!tournament) return;
  tournament.currentRound = round;
  await updateTournament(tournament);
}






















// 1. Added async to handle the live Firestore document download
async function openTournament(id) {
  
  showActionModal("Opening...", "success");

  // 2. Clear out the old local array lookup and read directly from the cloud source instead
  const tournament = await getCurrentTournament(); 

  // Secondary structural check: if the active database pointer isn't set yet, fetch it directly
  if (!tournament || String(tournament.id) !== String(id)) {
    setCurrentTournamentId(id); // Set the active document pointer ID
    const directFetch = await getCurrentTournament();
    if (!directFetch) {
      showAlert("Tournament not found in cloud database");
      return;
    }
  }

  // 3. Keep your UI routing configuration states intact
  localStorage.setItem("currentTournamentId", id);
  localStorage.setItem("currentTournamentFormat", tournament.format);
  localStorage.setItem("currentTournamentName", tournament.name);
  
  const tournamentName = tournament.name;
 
  // Lowercase normalization fallback safeguard check
  const formatType = (tournament.format || 'league').toLowerCase();

  if (formatType === "league") {
    document.getElementById("leagueName").textContent = tournamentName;
    goToTournamentPage();  
  } else {
    document.getElementById("cupName").textContent = tournamentName;
    goToCupPage();
  }
}








function buildTable() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  tournament.table = tournament.teams.map(team => ({
    name: team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    points: 0
  }));
  
  updateTournament(tournament);
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


function handleSetScore() {
  const home = document.getElementById("homeTeam").textContent.trim();
  const away = document.getElementById("awayTeam").textContent.trim();
  
  const homeGoalsInput = document.getElementById("homeGoals");
  const awayGoalsInput = document.getElementById("awayGoals");
  
  const hg = parseInt(homeGoalsInput.value);
  const ag = parseInt(awayGoalsInput.value);
  
  if (!home || !away || home === away || isNaN(hg) || isNaN(ag)) {
    showAlert("Invalid Team or Score input");
    return;
  }
  
  setMatchResult(home, away, hg, ag);
  
  closeResultRecord();
}




function setMatchResult(home, away, hg, ag) {
  const tournament = getCurrentTournament();
  if (!tournament) return;

  const match = tournament.matches.find(
    m => m.home === home && m.away === away
  );

  match.homeGoals = hg;
  match.awayGoals = ag;
  match.played = true;

  rebuildTableFromMatches();

  updateTournament(tournament);

  const updated = getCurrentTournament();
  renderFixtures();
  renderCupFixtures();
  renderCupTables();
  renderTable(getSortedTable(updated.table));
checkForEndOfGroupstage();
  
  showActionModal("✅ Result Saved", "success");

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






function renderTeams(containerId = "teamList") {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.className = "CupTeamsContainer";
  const counterLabel = document.getElementById("teamCount");
  const teamadded = document.getElementById("teamsadded");
  
  container.innerHTML = "";
  
  if (counterLabel) {
    counterLabel.textContent = `Total Teams Register : ${tournament.teams.length}`;
  }
  
  if (teamadded) {
    teamadded.textContent = `${tournament.teams.length}`;
  }
  
  tournament.teams.forEach((team, index) => {
    const div = document.createElement("div");
    div.className = "team-card";
    
    const logo = tournament.teamLogos?.[team];
    
    div.innerHTML = `
  <div class="team-swipe-wrapper">
    
    <div class="team-actions">
      <button class="btn-edit" onclick="openEditTeam(${index})">Edit</button>
      <button class="btn-delete" onclick="deleteTeam(${index})">Delete</button>
    </div>

    <div class="team-content">
      ${
        logo
          ? `<img class="team-logo" src="${logo}" alt="${team}">`
          : `<div class="team-logo-placeholder">?</div>`
      }
      <span>${team}</span>
    </div>

  </div>
`;    
    let startX = 0;
let currentX = 0;
let isSwiping = false;

const content = div.querySelector(".team-content");

const start = (x) => {
  startX = x;
  isSwiping = true;
};

const move = (x) => {
  if (!isSwiping) return;
  currentX = x;
  let diff = currentX - startX;
  if (diff < 0) {
    content.style.transform = `translateX(${diff}px)`;
  }
};

const end = () => {
  if (!isSwiping) return;
  isSwiping = false;
  let diff = currentX - startX;
  if (diff < -80) {
    content.style.transform = "translateX(-120px)";
  } else {
    content.style.transform = "translateX(0)";
  }
};

div.addEventListener("touchstart", (e) => start(e.touches[0].clientX));
div.addEventListener("mousedown", (e) => start(e.clientX));

div.addEventListener("touchmove", (e) => move(e.touches[0].clientX));
div.addEventListener("mousemove", (e) => move(e.clientX));

div.addEventListener("touchend", end);
div.addEventListener("mouseup", end);
div.addEventListener("mouseleave", end);
    
    container.appendChild(div);
  });
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
    const logo = tournament.teamLogos?.[teamName];
    
    const row = document.createElement("div");
    row.className = "form-row";
    
    row.innerHTML = `
      <div class="form-team">

        <span class="form-position">
          ${index + 1}
        </span>

        ${
          logo
            ? `<img class="team-logo" src="${logo}">`
            : `<div class="team-logo-placeholder">⚽</div>`
        }

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
    
    container.appendChild(row);
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



function renderTop5(containerId, data, title, suffix = "") {
  const el = document.getElementById(containerId);
  if (!el) return;
  
  const tournament = getCurrentTournament();
  const top5 = data.slice(0, 5);
  
  el.innerHTML = `
    <div class="record-card">

      <div class="record-title">
        ${title}
      </div>

      ${top5.map(([team, value], index) => {
        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
        const logo = tournament.teamLogos?.[team];

        return `
          <div class="record-row">

            <div class="rank">
              ${medals[index]}
            </div>

            <div class="team-side">
              ${
                logo
                  ? `<img class="team-logo" src="${logo}">`
                  : `<div class="team-logo-placeholder">?</div>`
              }
              <span class="team">${team}</span>
            </div>

            <div class="value">
              ${value} ${suffix}
            </div>

          </div>
        `;
      }).join("")}

    </div>
  `;
}


function renderMatchCard(containerId, match, title, extraLabel = "") {
  const el = document.getElementById(containerId);
  if (!el || !match) return;
  
  const tournament = getCurrentTournament();
  
  const homeLogo = tournament.teamLogos?.[match.home];
  const awayLogo = tournament.teamLogos?.[match.away];
  
  el.innerHTML = `
  

  
  <div class="record-card hero">
    <div class="record-title">${title}</div>


    <div class="match-vertical">

      <!-- HOME -->
      <div class="team-row">
        <div class="team-side">
          ${
            homeLogo
              ? `<img class="team-logo" src="${homeLogo}">`
              : `<div class="team-logo-placeholder">?</div>`
          }
          <span>${match.home}</span>
        </div>

        <div class="team-score">
          <b>${match.homeGoals}</b>
        </div>
      </div>

      <!-- AWAY -->
      <div class="team-row">
        <div class="team-side">
          ${
            awayLogo
              ? `<img class="team-logo" src="${awayLogo}">`
              : `<div class="team-logo-placeholder">?</div>`
          }
          <span>${match.away}</span>
        </div>

        <div class="team-score">
          <b>${match.awayGoals}</b>
        </div>
      </div>

      <!-- CENTER INFO -->
      <div class="record-sub center">
        ${extraLabel}
      </div>

    </div>
  </div>
  
`;

}



function renderStreakCard(containerId, dataArray, title, suffix = "") {
  const el = document.getElementById(containerId);
  if (!el || !dataArray) return;
  
  const tournament = getCurrentTournament();
  
  // Normalize data: If it's a single team pair like ["Arsenal", 5], wrap it in an array
  const normalizedData = Array.isArray(dataArray[0]) ? dataArray : [dataArray];
  const top3 = normalizedData.slice(0, 3);
  
  let rowsHtml = "";
  
  top3.forEach((data, index) => {
    if (!data || data.length < 2) return;
    const [team, value] = data;
    const logo = tournament.teamLogos?.[team];
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
    
    rowsHtml += `
      <div class="streak-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div class="team-side" style="display: flex; align-items: center; gap: 8px;">
          <span class="medal">${medal}</span>
          ${
            logo
              ? `<img class="team-logo" src="${logo}" style="width: 24px; height: 24px; object-fit: contain;">`
              : `<div class="team-logo-placeholder">?</div>`
          }
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

function rebuildTableFromMatches() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  
  const teams = tournament.teams || [];
  const matches = tournament.matches || [];
  
  const table = {};
  
  
  teams.forEach(team => {
    table[team] = {
      name: team,
      p: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      pts: 0
    };
  });
  
  
  matches.forEach(match => {
    if (!match || !match.played) return;
    if (!table[match.home] || !table[match.away]) return;
    
    
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
  });
  
  
  const sortedTable = Object.values(table).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    return b.gf - a.gf;
  });
  
  tournament.table = sortedTable;
  updateTournament(tournament);
  
  // Render it
  if (typeof renderTable === "function") {
    renderTable(tournament.table);
  }
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
    
    // Fallback logic to calculate Goal Difference correctly
    const gd = (team.gf || 0) - (team.ga || 0);
    const gdClass = gd < 0 ? 'neg' : '';
    
    // FIX: Swapped out abbreviated properties (.p, .w, etc.) for your actual database keys
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${team.name || ''}</strong></td>
      <td>${team.played || 0}</td>
      <td>${team.wins || 0}</td>
      <td>${team.draws || 0}</td>
      <td>${team.losses || 0}</td>
      <td>${team.gf || 0}</td>
      <td>${team.ga || 0}</td>
      <td class="${gdClass}">${gd >= 0 ? '+' + gd : gd}</td>
      <td><strong>${team.points || 0}</strong></td>
    `;
    
    tbody.appendChild(tr);
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
  
  const teamLogo = tournament.teamLogos?.[winner.team];
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
        ${isDecided && teamLogo 
          ? `<img src="${teamLogo}" class="champion-team-logo">` 
          : `<div class="team-logo-placeholder">?</div>`
        }
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
}
