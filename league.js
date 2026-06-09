function renderFixtures() {
  const tournament = getCurrentTournament();
  if (!tournament || !tournament.matches) return;

  const container = document.getElementById("fixtureList");
  container.innerHTML = "";

  const currentRound = getCurrentRound();
  const maxRound = Math.max(...tournament.matches.map(m => m.round || 1), 1);

  const h2 = document.getElementById("fixturePage").querySelector("h2");
  h2.innerText = maxRound === 1
    ? "Fixtures"
    : `Fixtures - Round ${currentRound}/${maxRound}`;

  const roundMatches = maxRound === 1
    ? tournament.matches
    : tournament.matches.filter(m => (m.round || 1) === currentRound);

  if (roundMatches.length === 0) {
    container.innerHTML = "<p>No matches</p>";
    return;
  }

  roundMatches.forEach(match => {
    const div = document.createElement("div");
    
    div.className = `fixture-row ${match.played ? 'played' : 'not-played'}`;

    div.innerHTML = `
      <span class="team home-team">${match.home}</span>
      <span class="score-badge ${match.played ? 'played' : 'not-played'}">
        ${match.played ? `${match.homeGoals} - ${match.awayGoals}` : "VS"}
      </span>
      <span class="team away-team">${match.away}</span>
    `;

    container.appendChild(div);
  });
}



function nextRound() {
  const tournament = getCurrentTournament();
  if (!tournament || !tournament.matches.length) return;

  const maxRound = Math.max(...tournament.matches.map(m => m.round || 1));
  let currentRound = getCurrentRound();

  if (currentRound < maxRound) {
    setCurrentRound(currentRound + 1);
    renderFixtures();
  }
}


function prevRound() {
  let currentRound = getCurrentRound();

  if (currentRound > 1) {
    setCurrentRound(currentRound - 1);
    renderFixtures();
  }
}






function renderShortView(data) {
  const tbody = document.getElementById("shortTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const topTeams = [...data]
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 5);

  topTeams.forEach((team, index) => {
    const mp = team.played ?? 0;
    const gd = team.gd ?? (team.gf - team.ga) ?? 0;
    const pts = team.points ?? 0;

    const tr = document.createElement("tr");
    
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${team.name}</td>
      <td>${mp}</td>
      <td>${gd > 0 ? '+' : ''}${gd}</td>
      <td>${pts}</td>
    `;

    tbody.appendChild(tr);
  });
}



function addTeam(name) {
  const tournament = getCurrentTournament();
  if (!tournament) return;

  if (tournament.teams.includes(name)) {
    alert("Team already exists");
    return;
  }

  tournament.teams.push(name);

  updateTournament(tournament);

  buildTable();

  const updated = getCurrentTournament();

  renderTable(getSortedTable(updated.table));
  renderShortView(updated.table);
  renderTeams();
}



function handleAddTeam() {
  const input = document.getElementById('teamNameInput');
  const name = input.value.trim();
  
  if (!name) {
    alert("Enter a team name");
    return;
  }
  renderTeams();

  addTeam(name);
  input.value = '';
}






function rebuildTableFromMatches() {
  const tournament = getCurrentTournament();
  if (!tournament) return;

  const table = {};

  tournament.teams.forEach(team => {
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

  tournament.matches.forEach(match => {
    if (!match.played) return;

    const home = table[match.home];
    const away = table[match.away];

    const hg = match.homeGoals;
    const ag = match.awayGoals;

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

  tournament.table = Object.values(table);

  updateTournament(tournament);
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


async function shareTable() {
  const wrapper = document.querySelector('.table-wrapper');
  const wasInScreenshotMode = wrapper.classList.contains('screenshot-mode');

  wrapper.classList.add('screenshot-mode');

  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#161b22',
      scale: 2,
      useCORS: true
    });

    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'league-table.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'eFootball League Table',
          text: 'League Volume 8',
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'league-table.png';
        a.click();
        URL.revokeObjectURL(url);
        alert('Image downloaded! Share it manually.');
      }
    });

  } catch (err) {
    console.error('Share failed:', err);
    alert('Could not capture table');
  } finally {
    if (!wasInScreenshotMode) {
      wrapper.classList.remove('screenshot-mode');
    }
  }
}



function shareFixtures() {
  const element = document.getElementById('fixtureScreenshotArea');
  const roundLabelEl = document.getElementById('roundLabel');
  
  const titleText = roundLabelEl ? roundLabelEl.textContent : 'Fixtures';
  const roundText = titleText.replace(/\s/g, '-');

  if (!element) {
    alert('Screenshot target area not found!');
    return;
  }

  html2canvas(element, {
    backgroundColor: '#0d1117',
    scale: 2,
    useCORS: true
  }).then(canvas => {
    canvas.toBlob(blob => {
      if (!blob) {
        alert('Failed to process screenshot image.');
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
    alert('Could not take screenshot');
  });
}




window.onload = function () {
  renderTournamentList();

  const tournament = getCurrentTournament();

  if (tournament?.table) {
    renderTable(getSortedTable(tournament.table));
    renderShortView(tournament.table);
  }
};





function generateFixtures(rounds) {
  const tournament = getCurrentTournament();
  if (!tournament) return;

  const teams = tournament.teams;
  if (teams.length < 2) {
    alert("Add at least 2 teams first");
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
}






function goToShortViewPage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  document.getElementById("tournamentPage").style.display = "none";
  document.getElementById("shortViewPage").style.display = "block";

  const tournament = getCurrentTournament();
  renderShortView(tournament?.table || []);
}


function goToFormViewPage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  document.getElementById("tournamentPage").style.display = "none";
  document.getElementById("formViewPage").style.display = "block";

  renderFormView();
}


function goToFixturePage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  document.getElementById("tournamentPage").style.display = "block";
  document.getElementById("fixturePage").style.display = "block";
populateTeamDropdowns();
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
  renderTeams();
}




const PAGES = [
  "tournamentPage",
  "tablePage",
  "shortViewPage",
  "formViewPage",
  "fixturePage",
  "statPage",
  "teamListPage"
];

function hideAllPages() {
  PAGES.forEach(id => {
    const pageElement = document.getElementById(id);
    if (pageElement) {
      pageElement.style.display = "none";
    }
  });
}


function goToTournamentPage() {
  document.getElementById("listOfTournamentPage").style.display = "none";

  hideAllPages();

  const page = document.getElementById("tournamentPage");
  if (page) page.style.display = "block";

  goToTablePage();
}




function goToListOfTournamentPage() {
  hideAllPages();
  document.getElementById("tournamentPage").style.display = "none";
  document.getElementById("listOfTournamentPage").style.display = "block";
}


function goToTablePage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  document.getElementById("tournamentPage").style.display = "block";
  document.getElementById("tablePage").style.display = "block";

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



function renderTeams() {
  const tournament = getCurrentTournament();
  if (!tournament) return;

  const container = document.getElementById("teamList");
  container.innerHTML = "";

  tournament.teams.forEach((team, index) => {
    const div = document.createElement("div");

    div.innerHTML = `
      <span>${team}</span>
      <button style="color:red" onclick="deleteTeam(${index})">
        Delete
      </button>
    `;

    container.appendChild(div);
  });
}




















function getTournaments() {
  try {
    return JSON.parse(localStorage.getItem("tournaments")) || [];
  } catch (e) {
    return [];
  }
}


function saveTournaments(tournaments) {
  localStorage.setItem("tournaments", JSON.stringify(tournaments));
}


function setCurrentTournamentId(id) {
  if (id === null || id === undefined) {
    localStorage.removeItem("currentTournamentId");
  } else {
    localStorage.setItem("currentTournamentId", String(id));
  }

}



function getCurrentTournament() {
  const id = Number(localStorage.getItem("currentTournamentId"));
  if (!id) return null;

  const tournaments = getTournaments();
  return tournaments.find(t => t.id === id) || null;
}




function getTournaments() {
  return JSON.parse(localStorage.getItem('tournaments')) || [];
}

function saveTournaments(tournaments) {
  localStorage.setItem('tournaments', JSON.stringify(tournaments));
}







function renderTournamentList() {
  const container = document.getElementById("tournamentList");
  if (!container) return;

  container.innerHTML = "";
  const tournaments = getTournaments();

  tournaments.forEach(tournament => {
    const div = document.createElement("div");
    div.className = "tournament-card";
    div.innerHTML = `
    <button onclick="deleteTournament(${tournament.id})">Delete</button>
      <h3>${tournament.name}</h3>
      <button onclick="openTournament(${tournament.id})">Open</button>
    `;
    container.appendChild(div);
  });
}





function openTournament(id) {
  // 🔍 Debug: confirm click is working
  alert("Opening tournament " + id);

  const tournaments = getTournaments();
  const tournament = tournaments.find(t => t.id === id);

  if (!tournament) {
    alert("Tournament not found");
    return;
  }


  localStorage.setItem("currentTournamentId", id);

  goToTournamentPage();
  
  
}



function renderFormView() {
  const tournament = getCurrentTournament();
  if (!tournament) return;

  const container = document.getElementById("formContainer");
  container.innerHTML = "";

  const teams = tournament.teams;
  const matches = tournament.matches || [];

  teams.forEach(team => {
    const teamMatches = matches
      .filter(m => m.played && (m.home === team || m.away === team))
      .slice(-5);

    const form = teamMatches.map(match => {
      let result = "D";

      if (match.home === team) {
        if (match.homeGoals > match.awayGoals) result = "W";
        else if (match.homeGoals < match.awayGoals) result = "L";
      } else {
        if (match.awayGoals > match.homeGoals) result = "W";
        else if (match.awayGoals < match.homeGoals) result = "L";
      }

      return result;
    });

    const div = document.createElement("div");
    div.className = "form-row";

    div.innerHTML = `
      <strong>${team}</strong>
      <span>${form.join(" ") || "No matches"}</span>
    `;

    container.appendChild(div);
  });
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


function renderTable(data) {
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  data.forEach((team, index) => {
    const tr = document.createElement("tr");
    
    const gd = team.gf - team.ga;
    
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${team.name}</td>
      <td>${team.p}</td>
      <td>${team.w}</td>
      <td>${team.d}</td>
      <td>${team.l}</td>
      <td>${team.gf}</td>
      <td>${team.ga}</td>
      <td>${gd}</td>
      <td>${team.pts}</td>
    `;
    
    tbody.appendChild(tr);
  });
}





function deleteFixtures(force = false) {
  const tournament = getCurrentTournament();
  if (!tournament) return;

  // If force is true, skip the second confirm window
  if (!force && !confirm("Delete all fixtures and match results for this tournament?")) {
    return;
  }

  tournament.matches = [];
  tournament.table = []; 

  updateTournament(tournament);
  
  renderFixtures();
  renderTable([]); // Directly pass empty array to avoid getSortedTable errors
  renderFormView();
  
  alert("Fixtures deleted.");
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
}


function handleGenerateFixtures() {
  const tournament = getCurrentTournament();
  if (!tournament) {
    showAlert("No tournament found");
    return;
  }
  
  if (tournament.matches && tournament.matches.length > 0) {
    if (!confirm("Fixtures already exist. Delete and regenerate?")) return;
    deleteFixtures(true);
  }
  
  showInputModal("Enter 1 for Single Round or 2 for Double Round:", (input) => {
    const rounds = parseInt(input);
    
    if (rounds !== 1 && rounds !== 2) {
      showAlert("Invalid input.");
      return;
    }
    
    generateFixtures(rounds);
    goToFixturePage();
  });
}



function handleSetScore() {
  const home = document.getElementById("homeTeam").value;
  const away = document.getElementById("awayTeam").value;

  const homeGoalsInput = document.getElementById("homeGoals");
  const awayGoalsInput = document.getElementById("awayGoals");

  const hg = parseInt(homeGoalsInput.value);
  const ag = parseInt(awayGoalsInput.value);

  if (!home || !away || home === away || isNaN(hg) || isNaN(ag)) {
    alert("Invalid input");
    return;
  }

  setMatchResult(home, away, hg, ag);

  homeGoalsInput.value = "";
  awayGoalsInput.value = "";
}


function setMatchResult(home, away, hg, ag) {
  const tournament = getCurrentTournament();
  if (!tournament) return;

  const match = tournament.matches.find(
    m => m.home === home && m.away === away
  );

  if (!match) {
    alert("No fixture found");
    return;
  }

  if (match.played) {
    const confirmOverride = confirm("This match has already been played. Do you want to override the results?");
    if (!confirmOverride) return;
  }

  match.homeGoals = hg;
  match.awayGoals = ag;
  match.played = true;

  rebuildTableFromMatches();

  updateTournament(tournament);

  const updated = getCurrentTournament();
  renderFixtures();
  renderTable(getSortedTable(updated.table));
  renderShortView(updated.table);
}



function resetMatchResult(home, away) {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const match = tournament.matches.find(
    m => m.home === home && m.away === away
  );
  
  if (!match) {
    showAlert("Match not found");
    return;
  }
  

  match.homeGoals = 0;
  match.awayGoals = 0;
  match.played = false;
  

  rebuildTableFromMatches();
  
 
  updateTournament(tournament);
  

  renderFixtures();
  renderTable(getSortedTable(tournament.table));
  renderShortView(tournament.table);
}


function confirmResetMatch(home, away) {
  showConfirmModal("Reset this match so you can re-enter result?", (confirmed) => {
    if (!confirmed) return;
    resetMatchResult(home, away);
  });
}

function handleResetMatch() {
  const home = document.getElementById("homeTeam").value;
  const away = document.getElementById("awayTeam").value;
  
  if (!home || !away || home === away) {
    showAlert("Select valid teams");
    return;
  }
  
  resetMatchResult(home, away);
}



