const LOGO_DB_NAME = "TournamentLogosDB";
const LOGO_STORE = "logos";

function openLogoDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LOGO_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LOGO_STORE)) {
        db.createObjectStore(LOGO_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function saveLogoToIndexedDB(key, base64Data) {
  return openLogoDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LOGO_STORE, "readwrite");
      tx.objectStore(LOGO_STORE).put(base64Data, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  });
}

async function addTeam(name, logo) {
  try {
    const tournament = getCurrentTournament();
    
    if (!tournament) {
      showAlert("No tournament selected");
      return;
    }
    
    if (!Array.isArray(tournament.teams)) {
      tournament.teams = [];
    }
    
    if (tournament.teams.includes(name)) {
      showAlert("Team already exists");
      return;
    }
    
    const logoKey = `${tournament.id}_${name}`;
    await saveLogoToIndexedDB(logoKey, logo);
    
    tournament.teams.push(name);
    tournament.teamLogos = tournament.teamLogos || {};
    tournament.teamLogos[name] = logoKey;
    
    saveTournament(tournament);
    
    showActionModal("✅ Team Registered", "success");
    
    if (typeof buildTable === "function") buildTable();
    if (typeof renderTeams === "function") renderTeams();
    
  } catch (err) {
    console.error("[addTeam] Error:", err);
    showAlert("Failed to add team");
  }
}

async function handleAddTeam() {
  const nameInput = document.getElementById("teamNameInput");
  const logoInput = document.getElementById("teamLogoInput");
  
  if (!nameInput || !logoInput) {
    showAlert("Error: Form elements not found");
    return;
  }
  
  const name = nameInput.value.trim();
  
  if (!name) {
    showAlert("Enter a team name");
    return;
  }
  
  const file = logoInput.files[0];
  
  if (!file) {
    showAlert("Team logo is required");
    return;
  }
  
  if (!file.type.startsWith("image/")) {
    showAlert("Please select an image file");
    return;
  }
  
  removeBackground(file, async (logo) => {
    if (!logo) {
      showAlert("Failed to process logo");
      return;
    }
    
    try {
      const tournament = getCurrentTournament();
      
      if (!tournament) {
        showAlert("No tournament selected");
        return;
      }
      
      if (!Array.isArray(tournament.teams)) {
        tournament.teams = [];
      }
      
      if (tournament.teams.includes(name)) {
        showAlert("Team already exists");
        return;
      }
      
      const logoKey = `${tournament.id}_${name}`;
      await saveLogoToIndexedDB(logoKey, logo);
      
      tournament.teams.push(name);
      tournament.teamLogos = tournament.teamLogos || {};
      tournament.teamLogos[name] = logoKey;
      
      saveTournament(tournament);
      
      nameInput.value = "";
      resetLogoUI();
      
      showActionModal("✅ Team Registered", "success");
      
      if (typeof buildTable === "function") buildTable();
      if (typeof renderTeams === "function") renderTeams();
      
    } catch (err) {
      console.error("[handleAddTeam] Error:", err);
      showAlert("Something went wrong");
    }
  });
}


function getLogoFromIndexedDB(key) {
  return openLogoDB().then(db => {
    return new Promise((resolve) => {
      const tx = db.transaction(LOGO_STORE, "readonly");
      const req = tx.objectStore(LOGO_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  });
}


async function renderTeams(containerId = "teamList") {
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
    
    const logoKey = tournament.teamLogos?.[team];
    
    div.innerHTML = `
      <div class="team-swipe-wrapper">
        <div class="team-actions">
          <button class="btn-edit" onclick="openEditTeam(${index})">Edit</button>
          <button class="btn-delete" onclick="deleteTeam(${index})">Delete</button>
        </div>
        <div class="team-content">
          <div class="team-logo-placeholder">?</div>
          <span>${team}</span>
        </div>
      </div>
    `;
    
    if (logoKey) {
      getLogoFromIndexedDB(logoKey).then(base64Logo => {
        const contentDiv = div.querySelector(".team-content");
        const placeholder = div.querySelector(".team-logo-placeholder");
        
        if (base64Logo && contentDiv && placeholder) {
          const img = document.createElement("img");
          img.className = "team-logo";
          img.src = base64Logo;
          img.alt = team;
          contentDiv.replaceChild(img, placeholder);
        }
      }).catch(err => console.error("Error loading logo:", err));
    }
    
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


function setMatchResult(home, away, hg, ag) {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const match = tournament.matches.find(
    m => m.home === home && m.away === away
  );
  
  if (!match) return;
  
  const wasUnplayed = !match.played;
  
  match.homeGoals = Number(hg);
  match.awayGoals = Number(ag);
  match.played = true;
  
  
  if (wasUnplayed || !match.playedAt) {
    match.playedAt = Date.now();
  }
  
  updateStreaks(tournament);
  rebuildTableFromMatches();
  updateTournament(tournament);
  
  renderFixtures();
  showActionModal("Result Saved", "success")
}


function getStableMatchOrder(matches) {
  return [...matches]
    .filter(m => m.played)
    .sort((a, b) => (a.playedAt || 0) - (b.playedAt || 0));
}

function updateStreaks(tournament) {
  if (!tournament?.matches) return;
  
  const ordered = getStableMatchOrder(tournament.matches);
  const streaks = {};
  
  ordered.forEach(m => {
    [m.home, m.away].forEach(team => {
      if (!streaks[team]) {
        streaks[team] = { current: 0, best: 0 };
      }
    });
    
    const homeUnbeaten = m.homeGoals >= m.awayGoals;
    const awayUnbeaten = m.awayGoals >= m.homeGoals;
    
    streaks[m.home].current = homeUnbeaten ? streaks[m.home].current + 1 : 0;
    streaks[m.away].current = awayUnbeaten ? streaks[m.away].current + 1 : 0;
    
    streaks[m.home].best = Math.max(streaks[m.home].best, streaks[m.home].current);
    streaks[m.away].best = Math.max(streaks[m.away].best, streaks[m.away].current);
  });
  
  tournament.streaks = Object.entries(streaks).map(([team, data]) => ({
    team,
    current: data.current,
    best: data.best
  }));
}


function backfillPlayedAtOnce(tournament) {
  if (!tournament?.matches) return;
  if (tournament.backfillDone) return; // already ran
  
  const now = Date.now();
  let time = now - tournament.matches.length * 1000;
  
  tournament.matches.forEach(m => {
    if (m.played && !m.playedAt) {
      m.playedAt = time;
      time += 1000;
    }
  });
  
  tournament.backfillDone = true;
  updateTournament(tournament);
  console.log("Backfill ran once for", tournament.name);
}


function getPlayedMatches(matches) {
  return matches
    .filter(m =>
      m.played === true &&
      typeof m.playedAt === "number" &&
      typeof m.homeGoals === "number" &&
      typeof m.awayGoals === "number"
    )
    .sort((a, b) => a.playedAt - b.playedAt);
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
    
    
    streaks[m.home].best = Math.max(streaks[m.home].best, streaks[m.home].current);
    streaks[m.away].best = Math.max(streaks[m.away].best, streaks[m.away].current);
  });
  
  return Object.entries(streaks)
    .map(([team, data]) => [team, data.best])
    .sort((a, b) => b[1] - a[1]);
}


function resetMatchPlayedAt(tournament, homeTeam, awayTeam, newDate) {
  const match = tournament?.matches?.find(
    m => m.home === homeTeam && m.away === awayTeam
  );
  
  if (!match) {
    showAlert('Match not found');
    return false;
  }
  
  match.playedAt = newDate ? new Date(newDate).getTime() : Date.now();
  
  updateTournament(tournament);
  rebuildTableFromMatches();
  updateStreaks(tournament);
  renderFixtures();
  renderTable?.(tournament.table);
  
  showAlert(`Date updated for ${homeTeam} vs ${awayTeam}`);
  return true;
}


function openDateResetModal(homeTeam = '', awayTeam = '') {
  const modal = document.getElementById('dateResetModal');
  if (!modal) {
    showAlert('Modal not found');
    return;
  }
  
  
  document.getElementById('dateResetHome').value = homeTeam || '';
  document.getElementById('dateResetAway').value = awayTeam || '';
  document.getElementById('dateResetDate').value = '';
  
  modal.style.display = 'block';
}

function handleDateReset() {
  const tournament = getCurrentTournament();
  if (!tournament) {
    showAlert('No tournament loaded');
    return;
  }
  
  let homeTeam = document.getElementById('dateResetHome').value.trim();
  let awayTeam = document.getElementById('dateResetAway').value.trim();
  const dateInput = document.getElementById('dateResetDate').value;
  
  
  
  if (!homeTeam || !awayTeam) {
    if (!tournament.matches) {
      showAlert('No matches in tournament');
      return;
    }
    
    homeTeam = prompt('Enter Home Team name:');
    if (!homeTeam) return;
    
    awayTeam = prompt('Enter Away Team name:');
    if (!awayTeam) return;
    
    
    document.getElementById('dateResetHome').value = homeTeam.trim();
    document.getElementById('dateResetAway').value = awayTeam.trim();
  }
  
  
  const matchExists = tournament.matches.some(m =>
    m.home.toLowerCase() === homeTeam.toLowerCase() &&
    m.away.toLowerCase() === awayTeam.toLowerCase()
  );
  
  if (!matchExists) {
    showAlert(`Match not found: ${homeTeam} vs ${awayTeam}`);
    return;
  }
  
  const newDate = dateInput ? dateInput : null;
  const success = resetMatchPlayedAt(tournament, homeTeam, awayTeam, newDate);
  
  if (success) {
    closeDateResetModal();
    if (typeof renderFixtures === 'function') renderFixtures();
    showAlert('Match date updated');
  }
}

function closeDateResetModal() {
  document.getElementById('dateResetModal').style.display = 'none';
}




async function tournamentCreator() {
  const input = document.getElementById("tournamentNameInput");
  const formatInput = document.getElementById("tournamentFormatInput");
  const startDateInput = document.getElementById("tournamentStartDate");
  const endDateInput = document.getElementById("tournamentEndDate");
  
  const name = input.value.trim();
  const format = formatInput.value;
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const matchDays = getSelectedMatchDays();
  
  
  if (!name) {
    showAlert("Enter tournament name");
    return;
  }
  
  if (!startDate || !endDate) {
    showAlert("Select start and end dates");
    return;
  }
  
  if (new Date(startDate) > new Date(endDate)) {
    showAlert("Start date must be before end date");
    return;
  }
  
  if (!matchDays.length) {
    showAlert("Select at least one match day");
    return;
  }
  
  
  matchDays.sort((a, b) => a - b);
  
  const id = Date.now().toString();
  
  
  const newTournament = {
    id,
    name,
    format,
    createdAt: Date.now(),
    
    
    startDate,
    endDate,
    matchDays,
    
    
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
  
  
  input.value = "";
  startDateInput.value = "";
  endDateInput.value = "";
  
  document
    .querySelectorAll('#matchDaysSelector input[type="checkbox"]')
    .forEach(cb => (cb.checked = false));
  
  hideCreateTournament();
  showAlert("Tournament created!");
  
  if (typeof renderTournamentList === "function") {
    renderTournamentList();
  }
}




function getSelectedMatchDays() {
  const checkboxes = document.querySelectorAll(
    '#matchDaysSelector input[type="checkbox"]:checked'
  );
  
  return Array.from(checkboxes).map(cb => Number(cb.value));
}



function getMatchDates(startDate, endDate, matchDays) {
  const dates = [];
  
  let current = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(current) || isNaN(end)) {
    return [];
  }
  
  while (current <= end) {
    if (matchDays.includes(current.getDay())) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}


function assignRoundDatesSmart(matches, tournament) {
  let matchDays = tournament.matchDays;
  const startDate = tournament.startDate;
  const endDate = tournament.endDate;
  
  if (!matchDays || matchDays.length === 0) {
    showAlert("No valid match days selected");
    return matches;
  }
  
  const matchDates = getMatchDates(startDate, endDate, matchDays);
  const totalRounds = Math.max(...matches.map(m => m.round));
  
  if (matchDates.length === 0) {
    showAlert("No valid match days selected");
    return matches;
  }
  
  let warning = false;
  
  const schedule = matchDates.map(date => ({
    date,
    rounds: []
  }));
  
  let round = 1;
  
  
  const extraRounds = totalRounds - matchDates.length;
  
  
  const indices = [...Array(schedule.length).keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  const doubleRoundDays = new Set(indices.slice(0, Math.max(0, extraRounds)));
  
  for (let i = 0; i < schedule.length && round <= totalRounds; i++) {
    schedule[i].rounds.push(round);
    round++;
    
    if (doubleRoundDays.has(i) && round <= totalRounds) {
      schedule[i].rounds.push(round);
      round++;
      warning = true;
    }
  }
  
  const roundToDateMap = {};
  
  schedule.forEach(slot => {
    slot.rounds.forEach(r => {
      roundToDateMap[r] = slot.date;
    });
  });
  
  const updatedMatches = matches.map(match => {
    const date = roundToDateMap[match.round];
    
    return {
      ...match,
      scheduledAt: date ? date.toISOString() : null,
      playedAt: null
    };
  });
  
  if (warning) {
    showAlert(
      "⚠ Schedule adjusted: some days have two consecutive rounds due to limited match days."
    );
  }
  
  return updatedMatches;
}






function assignKnockoutDates(matches, tournament) {
  if (!matches?.length) return matches;
  
  const matchDays = tournament.matchDays;
  const startDate = tournament.startDate;
  
  if (!matchDays?.length) {
    showAlert("No valid match days selected");
    return matches;
  }
  
  let knockStart = new Date(startDate);
  const groupsEnabled = tournament.settings?.enableGroups;
  
  if (groupsEnabled && tournament.groupMatches?.length) {
    const lastGroupDate = tournament.groupMatches.reduce((max, m) => {
      const d = m.scheduledAt ? new Date(m.scheduledAt) : null;
      return d && d > max ? d : max;
    }, new Date(0));
    
    if (lastGroupDate.getTime() > 0) {
      knockStart = new Date(lastGroupDate);
      knockStart.setDate(knockStart.getDate() + 1);
    }
  }
  
  const farFuture = new Date(knockStart);
  farFuture.setFullYear(farFuture.getFullYear() + 1);
  
  const matchDates = getMatchDates(knockStart, farFuture, matchDays);
  const totalRounds = Math.max(...matches.map(m => m.roundIndex));
  
  if (matchDates.length === 0) {
    showAlert("No valid match days selected");
    return matches;
  }
  
  const schedule = matchDates.map(date => ({ date, rounds: [] }));
  
  let round = 1;
  let warning = false;
  
  for (let i = 0; i < schedule.length && round <= totalRounds; i++) {
    schedule[i].rounds.push(round);
    round++;
  }
  
  if (round <= totalRounds) {
    let lastDate = schedule[schedule.length - 1].date;
    while (round <= totalRounds) {
      const nextSearchStart = new Date(lastDate);
      nextSearchStart.setDate(nextSearchStart.getDate() + 1);
      
      const nextValidDates = getMatchDates(nextSearchStart, farFuture, matchDays);
      if (!nextValidDates.length) break;
      
      const nextValid = nextValidDates[0];
      schedule.push({ date: nextValid, rounds: [round] });
      lastDate = nextValid;
      round++;
      warning = true;
    }
  }
  
  const roundToDateMap = {};
  schedule.forEach(slot => {
    slot.rounds.forEach(r => {
      roundToDateMap[r] = slot.date;
    });
  });
  
  const updatedMatches = matches.map(match => {
    const date = roundToDateMap[match.roundIndex];
    return {
      ...match,
      scheduledAt: date ? date.toISOString() : null,
      playedAt: null
    };
  });
  
  if (warning) {
    showAlert("⚠ Schedule extended beyond tournament end date on your selected match days.");
  }
  
  return updatedMatches;
}



function renderKnockoutFixtures(roundIndex = 1) {
  currentKnockoutRoundIndex = roundIndex;
  
  const tournament = getCurrentTournament();
  if (!tournament || !tournament.knockoutMatches) return;
  
  const container = document.getElementById("knockOutFixtureList");
  if (!container) return;
  container.innerHTML = "";
  
  const matches = tournament.knockoutMatches.filter(
    m => (m.roundIndex || 1) === roundIndex
  );
  
  if (!matches.length) {
    container.innerHTML = `<p class="emptyText">Group stage in progress.....<br> Knockout Matches will appear here as soon as group stage is completed</p>`;
    return;
  }
  
  const getTeamName = (team) => {
    if (!team || team === "BYE") return "Awaiting Winner";
    if (typeof team === "string") return team;
    return team.name || "Awaiting Winner";
  };
  
  const roundSize =
    tournament.settings.knockoutSize / Math.pow(2, roundIndex - 1);
  
  const roundName =
    roundSize === 8 ? "Quarter-Finals" :
    roundSize === 4 ? "Semi-Finals" :
    roundSize === 2 ? "Final" :
    `Round of ${roundSize}`;
  
  const roundLabel = document.getElementById("roundLabel");
  if (roundLabel) roundLabel.innerText = roundName;
  
  const header = document.createElement("div");
  header.className = "round-header";
  header.innerText = roundName;
  container.appendChild(header);
  
  matches.forEach(match => {
    const homeName = getTeamName(match.home);
    const awayName = getTeamName(match.away);
    
    const div = document.createElement("div");
    div.className = `fixture-row ${match.played ? "played" : "not-played"}`;
    
    const homeLogoKey = tournament.teamLogos?.[homeName];
    const awayLogoKey = tournament.teamLogos?.[awayName];
    
    div.innerHTML = `
      <div class="fixture-label">
        ${tournament.name || "Tournament"} • ${roundName}
      </div>
      
      <div class="fixture-row-content">
        <div class="fixture-teams-stack">
          <div class="team-row-item team-home-container">
            <div class="fixture-team-logo-placeholder">?</div>
            <span class="fixture-team-name">${homeName}</span>
          </div>
          
          <div class="team-row-item team-away-container">
            <div class="fixture-team-logo-placeholder">?</div>
            <span class="fixture-team-name">${awayName}</span>
          </div>
        </div>
        
        <div class="fixture-status-pane">
          ${match.played
            ? `
              <div class="score-stack">
                <span class="score-badge played">${match.homeGoals}</span>
                <span class="ft-badge">Full Time</span>
                <span class="score-badge played">${match.awayGoals}</span>
              </div>
            `
            : `
              <span class="vs-text-alt">
                ${match.scheduledAt ? formatMatchDay(match.scheduledAt) : "Vs"}
              </span>
            `
          }
        </div>
      </div>
      
      ${match.played ? `<div class="match-playedTime">${formatRecordedTime(match.playedAt)}</div>` : ""}
    `;
    
    if (homeLogoKey && homeName !== "Awaiting Winner") {
      getLogoFromIndexedDB(homeLogoKey).then(base64Logo => {
        const homeRow = div.querySelector(".team-home-container");
        const placeholder = homeRow?.querySelector(".fixture-team-logo-placeholder");
        if (base64Logo && homeRow && placeholder) {
          const img = document.createElement("img");
          img.className = "fixture-team-logo";
          img.src = base64Logo;
          homeRow.replaceChild(img, placeholder);
        }
      });
    }
    
    if (awayLogoKey && awayName !== "Awaiting Winner") {
      getLogoFromIndexedDB(awayLogoKey).then(base64Logo => {
        const awayRow = div.querySelector(".team-away-container");
        const placeholder = awayRow?.querySelector(".fixture-team-logo-placeholder");
        if (base64Logo && awayRow && placeholder) {
          const img = document.createElement("img");
          img.className = "fixture-team-logo";
          img.src = base64Logo;
          awayRow.replaceChild(img, placeholder);
        }
      });
    }
    
    div.style.cursor = "pointer";
    div.addEventListener("click", () => {
      openCupResultRecord(match);
    });
    
    container.appendChild(div);
  });
}



let currentKnockoutRoundIndex = 1;

function toggleBracketMode(mode) {
  document
    .querySelectorAll(".bracketTopActions .bracket-tab")
    .forEach(btn => btn.classList.remove("active"));
  
  const bracketView = document.getElementById("bracketViewport");
  const fixturesView = document.getElementById("bracketFixturesView");
  
  if (mode === "bracket") {
    bracketView.style.display = "block";
    fixturesView.style.display = "none";
    
    renderFullBracket();
    
    const tabs = document.querySelectorAll(".bracketTopActions .bracket-tab");
    if (tabs[1]) tabs[1].classList.add("active");
  }
  
  else {
    bracketView.style.display = "none";
    fixturesView.style.display = "block";
    
    renderKnockoutFixtures();
    
    const tabs = document.querySelectorAll(".bracketTopActions .bracket-tab");
    if (tabs[0]) tabs[0].classList.add("active");
  }
}


function enableKnockoutSwipe() {
  const container = document.getElementById("knockOutFixtureList");
  if (!container) return;
  
  let startX = 0;
  let endX = 0;
  
  container.addEventListener("touchstart", e => {
    startX = e.changedTouches[0].screenX;
  });
  
  container.addEventListener("touchend", e => {
    endX = e.changedTouches[0].screenX;
    handleSwipe();
  });
  
  function handleSwipe() {
    const diff = startX - endX;
    const threshold = 50;
    
    const tournament = getCurrentTournament();
    const maxRounds = Math.max(
      ...tournament.knockoutMatches.map(m => m.roundIndex || 1)
    );
    
    // swipe left → next
    if (diff > threshold && currentKnockoutRoundIndex < maxRounds) {
      renderKnockoutFixtures(currentKnockoutRoundIndex + 1);
    }
    
    // swipe right → previous
    if (diff < -threshold && currentKnockoutRoundIndex > 1) {
      renderKnockoutFixtures(currentKnockoutRoundIndex - 1);
    }
  }
}


function shareKnockoutFixtures() {
  const element = document.getElementById('knockOutFixtureList');
  const titleText = document.getElementById('roundLabel')?.textContent || 'Knockout Fixtures';
  const fileName = titleText.replace(/\s/g, '-');
  
  if (!element) {
    showAlert('Knockout fixture list not found!');
    return;
  }
  
  const options = {
    backgroundColor: '#0d1117',
    useCORS: true,
    allowTaint: true,
    logging: false,
    imageTimeout: 0,
    scale: Math.min(4, window.devicePixelRatio * 2),
    width: element.scrollWidth,
    height: element.scrollHeight,
    scrollX: 0,
    scrollY: 0,
    
    onclone: (doc) => {
      const cloned = doc.getElementById('knockOutFixtureList');
      if (cloned) {
        cloned.style.background = '#0d1117';
        cloned.style.overflow = 'visible';
        cloned.style.height = 'auto';
        cloned.style.width = '100%';
        
        cloned.querySelectorAll('*').forEach(el => {
          el.style.webkitFontSmoothing = 'antialiased';
          el.style.textRendering = 'geometricPrecision';
        });
      }
    }
  };
  
  html2canvas(element, options).then(canvas => {
    canvas.toBlob(blob => {
      if (!blob) {
        show('Failed to process screenshot image.');
        return;
      }
      
      const file = new File(
        [blob],
        `knockout-${fileName}.png`, { type: 'image/png' }
      );
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: titleText,
          text: `Check out the latest ${titleText}!`
        }).catch(err => console.log('Share dismissed', err));
      } else {
        const link = document.createElement('a');
        link.download = `knockout-${fileName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }, 'image/png');
  }).catch(err => {
    console.error(err);
    showAlert('Could not take screenshot');
  });
}




function populateTournamentMapping() {
  const tournaments = getTournaments();
  
  const selects = {
    league: document.getElementById("mapLeague"),
    ucl: document.getElementById("mapUCL"),
    uel: document.getElementById("mapUEL"),
    cup: document.getElementById("mapCup"),
    super: document.getElementById("mapSuper")
  };
  
  
  Object.values(selects).forEach(select => {
    if (!select) return;
    select.innerHTML = `<option value="">-- Select Tournament --</option>`;
  });
  
  tournaments.forEach(t => {
    const format = (t.format || "").toLowerCase();
    
    const optionHTML = `<option value="${t.id}">${t.name}</option>`;
    
    
    if (format === "league") {
      selects.league?.insertAdjacentHTML("beforeend", optionHTML);
    }
    
    
    else {
      selects.ucl?.insertAdjacentHTML("beforeend", optionHTML);
      selects.uel?.insertAdjacentHTML("beforeend", optionHTML);
      selects.cup?.insertAdjacentHTML("beforeend", optionHTML);
      selects.super?.insertAdjacentHTML("beforeend", optionHTML);
    }
  });
}



function setActiveTourPageButton(activeBtnId) {
  document.getElementById("showTournamentsBtn")?.classList.remove("active");
  document.getElementById("showPOTSBtn")?.classList.remove("active");
  
  document.getElementById(activeBtnId)?.classList.add("active");
}



function savePOTConfig() {
  const config = {
    league: document.getElementById("mapLeague")?.value || "",
    ucl: document.getElementById("mapUCL")?.value || "",
    uel: document.getElementById("mapUEL")?.value || "",
    cup: document.getElementById("mapCup")?.value || "",
    super: document.getElementById("mapSuper")?.value || "",
    lastUpdated: Date.now()
  };
  
  localStorage.setItem("posConfig", JSON.stringify(config));
  
  console.log("✅ POTS config saved:", config);
}


function setupPOTListeners() {
  const ids = ["mapLeague", "mapUCL", "mapUEL", "mapCup", "mapSuper"];
  
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    
    el.addEventListener("change", () => {
      savePOTConfig();
      calculatePOT();
      refreshPOTMapping();
    });
  });
}


function loadPOTConfig() {
  const config = JSON.parse(localStorage.getItem("posConfig")) || {};
  
  document.getElementById("mapLeague").value = config.league || "";
  document.getElementById("mapUCL").value = config.ucl || "";
  document.getElementById("mapUEL").value = config.uel || "";
  document.getElementById("mapCup").value = config.cup || "";
  document.getElementById("mapSuper").value = config.super || "";
}



function refreshPOTMapping() {
  const oldConfig = JSON.parse(localStorage.getItem("posConfig")) || {};
  
  populateTournamentMapping();
  
  
  document.getElementById("mapLeague").value = oldConfig.league || "";
  document.getElementById("mapUCL").value = oldConfig.ucl || "";
  document.getElementById("mapUEL").value = oldConfig.uel || "";
  document.getElementById("mapCup").value = oldConfig.cup || "";
  document.getElementById("mapSuper").value = oldConfig.super || "";
}



function calculatePOT() {
  
  const config = JSON.parse(localStorage.getItem("posConfig") || "{}");
  
  const league = getTournament(config.league);
  const ucl = getTournament(config.ucl);
  const uel = getTournament(config.uel);
  const cup = getTournament(config.cup);
  const superCup = getTournament(config.super);
  
  
  if (!league) {
    document.querySelector("#posTable tbody").innerHTML = `
      <tr>
        <td colspan="10">Select a league tournament</td>
      </tr>
    `;
    return;
  }
  
  
  const teams = {};
  
  
  
  buildLeagueData(teams, league);
  
  
  
  addCompetitionData(teams, ucl, "ucl");
  addCompetitionData(teams, uel, "uel");
  addCompetitionData(teams, cup, "cup");
  addCompetitionData(teams, superCup, "super");
  
  
  const ranking = Object.values(teams);
  
  
  calculatePOTBonuses(ranking);
  
  
  ranking.forEach(team => {
    
    team.total =
      team.leaguePoints +
      team.uclPoints +
      team.uelPoints +
      team.cupPoints +
      team.superPoints +
      team.attackPoints +
      team.topScorerPoints +
      team.defensePoints;
    
  });
  
  
  ranking.sort((a, b) => b.total - a.total);
  
  
  renderPOTTable(ranking);
  
}


function getLeaguePoints(position) {
  
  const points = {
    1: 75,
    2: 65,
    3: 55,
    4: 45,
    5: 35,
    6: 25,
    7: 15,
    8: 10
  };
  
  return points[position] || 5;
  
}



function buildLeagueData(store, tournament) {
  
  if (!Array.isArray(tournament.table)) return;
  
  
  
  const sortedTable = [...tournament.table].sort((a, b) => {
    
    if (b.pts !== a.pts) {
      return b.pts - a.pts;
    }
    
    return b.gd - a.gd;
    
  });
  
  
  sortedTable.forEach((team, index) => {
    
    const position = index + 1;
    
    
    store[team.name] = {
      
      name: team.name,
      
      position: position,
      
      gf: team.gf || 0,
      ga: team.ga || 0,
      played: team.played || 0,
      
      
      leaguePoints: getLeaguePoints(position),
      
      
      uclPoints: 0,
      uelPoints: 0,
      cupPoints: 0,
      superPoints: 0,
      
      attackPoints: 0,
      topScorerPoints: 0,
      defensePoints: 0
    };
    
  });
  
}




function calculatePOTBonuses(teams) {
  
  
  teams.forEach(team => {
    
    const gpg = team.played ?
      team.gf / team.played :
      0;
    
    team.attackPoints = Math.round(gpg * 10);
    
    team.topScorerPoints = 0;
    team.defensePoints = 0;
    
  });
  
  
  
  const scorers = [...teams]
    .sort((a, b) => b.gf - a.gf);
  
  
  if (scorers[0]) scorers[0].topScorerPoints = 12;
  if (scorers[1]) scorers[1].topScorerPoints = 8;
  if (scorers[2]) scorers[2].topScorerPoints = 5;
  
  
  
  const defense = [...teams]
    .sort((a, b) => a.ga - b.ga);
  
  
  if (defense[0]) defense[0].defensePoints = 12;
  if (defense[1]) defense[1].defensePoints = 8;
  if (defense[2]) defense[2].defensePoints = 5;
  
}

function renderPOTTable(teams) {
  
  const tbody = document.querySelector("#posTable tbody");
  
  if (!tbody) return;
  
  tbody.innerHTML = teams.map((team, index) => {
    
    return `
      <tr>
        <td>${index + 1}</td>

        <td>
          <strong>${team.name}</strong>
        </td>

        <td>${team.leaguePoints}</td>

        <td>${team.uclPoints}</td>

        <td>${team.uelPoints}</td>

        <td>${team.cupPoints}</td>

        <td>${team.superPoints}</td>

        <td>${team.attackPoints}</td>

        <td>${team.topScorerPoints}</td>

        <td>${team.defensePoints}</td>

        <td>
          <strong>${team.total}</strong>
        </td>

      </tr>
    `;
    
  }).join("");
  
}



function addCompetitionData(store, tournament, type) {
  
  if (!tournament || !tournament.knockoutMatches) return;
  
  
  const matches = tournament.knockoutMatches;
  
  
  const getName = (team) => {
    
    if (!team) return null;
    
    if (typeof team === "string") {
      return team;
    }
    
    return team.name || null;
    
  };
  
  
  let points;
  
  
  if (type === "ucl") {
    points = {
      winner: 55,
      runner: 35,
      semi: 20,
      quarter: 8
    };
  }
  
  
  else if (type === "uel") {
    points = {
      winner: 35,
      runner: 22,
      semi: 12,
      quarter: 5
    };
  }
  
  
  else if (type === "cup") {
    points = {
      winner: 18,
      runner: 10,
      semi: 5,
      quarter: 0
    };
  }
  
  
  else if (type === "super") {
    points = {
      winner: 8,
      runner: 4,
      semi: 0,
      quarter: 0
    };
  }
  
  
  
  const rounds = {};
  
  
  matches.forEach(match => {
    
    if (!rounds[match.roundIndex]) {
      rounds[match.roundIndex] = [];
    }
    
    rounds[match.roundIndex].push(match);
    
  });
  
  
  
  const finalRound =
    Math.max(...Object.keys(rounds));
  
  
  const finalMatches =
    rounds[finalRound] || [];
  
  
  
  // 🏆 Winner + Runner up
  
  const final = finalMatches[0];
  
  
  if (final && final.played) {
    
    const winner =
      final.homeGoals > final.awayGoals ?
      getName(final.home) :
      getName(final.away);
    
    
    const runner =
      final.homeGoals > final.awayGoals ?
      getName(final.away) :
      getName(final.home);
    
    
    
    if (store[winner]) {
      
      store[winner][type + "Points"] =
        points.winner;
      
    }
    
    
    if (store[runner]) {
      
      store[runner][type + "Points"] =
        points.runner;
      
    }
    
  }
  
  
  
  
  
  Object.keys(rounds).forEach(round => {
    
    
    const size =
      rounds[round].length * 2;
    
    
    
    let bonus = 0;
    
    
    if (size === 4) {
      bonus = points.semi;
    }
    
    
    if (size === 8) {
      bonus = points.quarter;
    }
    
    
    
    rounds[round].forEach(match => {
      
      
      if (!match.played) return;
      
      
      const teams = [
        getName(match.home),
        getName(match.away)
      ];
      
      
      
      teams.forEach(team => {
        
        
        if (!store[team]) return;
        
        
        
        
        if (store[team][type + "Points"] === 0) {
          
          store[team][type + "Points"] = bonus;
          
        }
        
      });
      
      
    });
    
    
  });
  
  
}


async function sharePOTSTable() {
  const wrapper = document.querySelector('.pos-table-container');
  const table = wrapper.querySelector('table');
  
  const prev = {
    overflow: wrapper.style.overflow,
    width: wrapper.style.width,
    maxWidth: wrapper.style.maxWidth,
    tableWidth: table.style.width
  };
  
  wrapper.classList.add('screenshot-mode');
  
  wrapper.style.overflow = 'visible';
  wrapper.style.width = 'max-content';
  wrapper.style.maxWidth = 'none';
  table.style.width = 'max-content';
  
  await new Promise(r => setTimeout(r, 150));
  
  try {
    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#161b22',
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: wrapper.scrollWidth
    });
    
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'rankings.png', { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Player of the Season Rankings',
          text: 'Player Of The Season Ranking',
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rankings.png';
        a.click();
        URL.revokeObjectURL(url);
        showActionModal('Image downloaded! Share it manually.', 'success');
      }
    });
    
  } catch (err) {
    console.error(err);
    showActionModal('Could not capture table', 'delete');
  } finally {
    wrapper.classList.remove('screenshot-mode');
    
    wrapper.style.overflow = prev.overflow;
    wrapper.style.width = prev.width;
    wrapper.style.maxWidth = prev.maxWidth;
    table.style.width = prev.tableWidth;
  }
}



function rebuildTableFromMatches() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  

  const prevRanks = tournament.prevRanks || {};
  
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
      pts: 0,
      change: 'same'
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
  
  
  const sortedTable = Object.values(table).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
  

  sortedTable.forEach((team, newIndex) => {
    const oldIndex = prevRanks[team.name];
    
    if (oldIndex !== undefined) {
      if (newIndex < oldIndex) {
        team.change = 'up';
      } else if (newIndex > oldIndex) {
        team.change = 'down';
      } else {
        team.change = 'same';
      }
    } else {
      team.change = 'same'; 
    }
  });
  

  const newRanks = {};
  sortedTable.forEach((team, index) => {
    newRanks[team.name] = index;
  });
  
  
  tournament.table = sortedTable;
  updateTournament(tournament);
  
  if (typeof renderTable === "function") {
    renderTable(tournament.table);
  }
}

function getChangeIndicator(change) {
  if (change === 'up') {
    return `<span class="pos-change up" title="Moved up">&#9650;</span>`;
  } else if (change === 'down') {
    return `<span class="pos-change down" title="Moved down">&#9660;</span>`;
  }
  return `<span class="pos-change same" title="No change"></span>`;
}

async function renderTable(data = []) {
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  if (!Array.isArray(data) || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No table data</td></tr>`;
    return;
  }
  
  const tournament = typeof getCurrentTournament === "function" ? getCurrentTournament() : null;
  
  data.forEach((team, index) => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-row-index", index);
    
    const gd = team.gd ?? ((team.gf || 0) - (team.ga || 0));
    const gdClass = gd < 0 ? 'neg' : '';
    const indicator = getChangeIndicator(team.change);
    const logoKey = tournament?.teamLogos?.[team.name];
    
    tr.innerHTML = `
      <td>
        <div class="rank-cell">
          <span class="rank-num">${index + 1}</span>
          ${indicator}
        </div>
      </td>
      <td>
        <div class="table-team-cell">
          <div class="team-logo-placeholder">?</div>
          <strong class="team-name">${team.name || ''}</strong>
        </div>
      </td>
      <td>${team.played || 0}</td>
      <td>${team.wins || 0}</td>
      <td>${team.draws || 0}</td>
      <td>${team.losses || 0}</td>
      <td>${team.gf || 0}</td>
      <td>${team.ga || 0}</td>
      <td class="${gdClass}">${gd >= 0 ? '+' + gd : gd}</td>
      <td><strong>${team.pts || 0}</strong></td>
    `;
    
    if (logoKey && typeof getLogoFromIndexedDB === "function") {
      getLogoFromIndexedDB(logoKey).then(base64Logo => {
        const teamCell = tr.querySelector(".table-team-cell");
        const placeholder = teamCell?.querySelector(".team-logo-placeholder");
        
        if (base64Logo && teamCell && placeholder) {
          const img = document.createElement("img");
          img.className = "table-team-logo";
          img.src = base64Logo;
          img.alt = team.name || "Logo";
          teamCell.replaceChild(img, placeholder);
        }
      }).catch(err => console.error("Error loading table team logo:", err));
    }
    
    tbody.appendChild(tr);
  });
}



function recordMatchResult(matchId, homeGoals, awayGoals) {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
 
  const currentRanks = {};
  if (Array.isArray(tournament.table)) {
    tournament.table.forEach((team, index) => {
      currentRanks[team.name] = index;
    });
  }
  
  tournament.prevRanks = currentRanks;
  
  const match = tournament.matches.find(m => String(m.id) === String(matchId));
  if (match) {
    match.played = true;
    match.homeGoals = Number(homeGoals);
    match.awayGoals = Number(awayGoals);
  }
  
  updateTournament(tournament);
  

  rebuildTableFromMatches();
}



function toggleDropdown() {
  document.getElementById("dropdownMenu").classList.toggle("show");
}

function handleMenuClick(value) {
  
  if (value === "fullview") toggleScreenshotMode();
  else if (value === "share") shareTable();
  else toggleView(value);
  
  
  document.getElementById("dropdownMenu").classList.remove("show");
}



document.addEventListener("click", function(e) {
  const dropdown = document.querySelector(".custom-dropdown");
  if (!dropdown.contains(e.target)) {
    document.getElementById("dropdownMenu").classList.remove("show");
  }
});


function updateDropdownLabel(view) {
  const dropdownToggle = document.querySelector(".dropdown-toggle");
  const labels = {
    table: "📊 Table",
    forms: "📈 Forms",
    teams: "👥 Teams",
    records: "🏆 Records"
  };
  
  dropdownToggle.textContent = labels[view] || "📊 Table";
}




let currentSwapView = 0;
const slider = document.getElementById("viewSlider");

function updateSwapView() {
  slider.style.transform = `translate3d(-${currentSwapView * 50}%, 0, 0)`;
  
  if (currentSwapView === 0) {
    showTournamentView();
  } else {
    showPOTSView();
  }
}


let startX = 0;

document.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
});

document.addEventListener("touchend", (e) => {
  let endX = e.changedTouches[0].clientX;
  let diff = startX - endX;
  
  if (diff > 50) {
    currentSwapView = 1;
  } else if (diff < -50) {
    currentSwapView = 0;
  }
  
  updateSwapView();
});


function showPOTSView() {
  document.getElementById("viewIndicator").textContent = "POTS Rankings";
  
  populateTournamentMapping();
  loadPOTConfig();
  setupPOTListeners();
  calculatePOT();
}


function showTournamentView() {
  document.getElementById("viewIndicator").textContent = "Tournaments";
}

function enableSwipeForRounds() {
  const container = document.getElementById("fixtureList");
  if (!container) return;
  
  let touchStartX = 0;
  let touchEndX = 0;
  const swipeThreshold = 60;
  
  container.addEventListener("touchstart", e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  
  container.addEventListener("touchend", e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });
  
  
  let mouseDown = false;
  container.addEventListener("mousedown", e => {
    mouseDown = true;
    touchStartX = e.screenX;
  });
  container.addEventListener("mouseup", e => {
    if (!mouseDown) return;
    mouseDown = false;
    touchEndX = e.screenX;
    handleSwipe();
  });
  
  function handleSwipe() {
    const diff = touchEndX - touchStartX;
    
    if (Math.abs(diff) < swipeThreshold) return;
    
    if (diff > 0) {
      
      console.log("[Swipe] Right -> Prev Round");
      prevRound();
    } else {
      
      console.log("[Swipe] Left -> Next Round");
      nextRound();
    }
  }
}



function getMaxRound() {
  const tournament = getCurrentTournament();
  if (!tournament || !tournament.matches?.length) return 1;
  
  const rounds = tournament.matches.map(m => m.round || 1);
  return Math.max(...rounds);
}



function renderRoundList() {
  const container = document.getElementById("roundCarousel");
  if (!container) return;
  
  const tournament = getCurrentTournament();
  if (!tournament || !tournament.matches) return;
  
  const current = getCurrentRound();
  const max = Math.max(...tournament.matches.map(m => m.round || 1), 1);
  
  let track = container.querySelector(".roundTrack");
  if (!track) {
    track = document.createElement("div");
    track.className = "roundTrack";
    container.appendChild(track);
  }
  
  track.innerHTML = "";
  
  for (let i = 1; i <= max; i++) {
    const el = document.createElement("h2");
    el.className = "roundText";
    if (i === current) el.classList.add("active");
    else if (i === current - 1) el.classList.add("prev");
    else if (i === current + 1) el.classList.add("next");
    el.textContent = `Round ${i} / ${max}`;
    el.onclick = () => goToRound(i);
    track.appendChild(el);
  }
  
  requestAnimationFrame(centerActiveRound);
}

function centerActiveRound() {
  const container = document.getElementById("roundCarousel");
  const track = container?.querySelector(".roundTrack");
  const active = track?.querySelector(".roundText.active");
  if (!container || !track || !active) return;
  
  const containerRect = container.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  
  const offset = activeRect.left - containerRect.left -
    containerRect.width / 2 +
    activeRect.width / 2;
  
  const currentTranslate = getTranslateX(track);
  
  track.style.transform = `translateX(${currentTranslate - offset}px)`;
}

function goToRound(round) {
  setCurrentRound(round);
  
  updateRoundClasses();
  requestAnimationFrame(centerActiveRound);
}

function updateRoundClasses() {
  const track = document.querySelector(".roundTrack");
  if (!track) return;
  
  const current = getCurrentRound();
  
  track.querySelectorAll(".roundText").forEach((el, index) => {
    const i = index + 1;
    
    el.classList.remove("active", "prev", "next");
    
    if (i === current) el.classList.add("active");
    else if (i === current - 1) el.classList.add("prev");
    else if (i === current + 1) el.classList.add("next");
  });
}

function getTranslateX(el) {
  const style = window.getComputedStyle(el);
  const matrix = new DOMMatrixReadOnly(style.transform);
  return matrix.m41;
}


function shareForm() {
  const element = document.getElementById('formContainer');
  
  const titleText = 'Recent Forms';
  const formText = titleText.replace(/\s/g, '-');
  
  if (!element) {
    showAlert('Screenshot target area not found!');
    return;
  }
  
  const options = {
    useCORS: true,
    allowTaint: true,
    logging: false,
    imageTimeout: 0,
    
    scale: Math.min(4, window.devicePixelRatio * 2),
    
    onclone: (doc) => {
      const cloned = doc.getElementById('formContainer');
      if (cloned) {
        cloned.style.background = '#21262d';
        cloned.style.webkitFontSmoothing = 'antialiased';
        cloned.style.textRendering = 'geometricPrecision';
      }
    }
  };
  
  html2canvas(element, options).then(canvas => {
    
    canvas.toBlob(blob => {
      if (!blob) {
        show('Failed to process screenshot image.');
        return;
      }
      
      const file = new File(
        [blob],
        `form-${formText}.png`, { type: 'image/png' }
      );
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: titleText,
          text: `Check out the latest ${titleText}!`
        }).catch(err => console.log('Share dismissed', err));
      } else {
        const link = document.createElement('a');
        link.download = `form-${formText}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }, 'image/png');
    
  }).catch(err => {
    console.error('Screenshot failed:', err);
    showAlert('Could not take screenshot');
  });
}



function shareBracket() {
  const element = document.getElementById('bracket-container');
  const titleText = document.getElementById('roundLabel')?.textContent || 'Bracket';
  const fileName = titleText.replace(/\s/g, '-');
  
  if (!element) {
    showAlert('Bracket container not found!');
    return;
  }
  
  
  const width = element.scrollWidth;
  const height = element.scrollHeight;
  
  const options = {
    useCORS: true,
    allowTaint: false,
    logging: false,
    imageTimeout: 0,
    backgroundColor: '#21262d',
    scale: Math.min(2, window.devicePixelRatio),
    
    
    width: width,
    height: height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
    
    onclone: (doc) => {
      const original = doc.getElementById('bracket-container');
      if (!original) return;
      
      
      original.style.transform = 'none';
      original.style.position = 'static';
      original.style.margin = '0';
      
      
      doc.body.style.overflow = 'visible';
      doc.documentElement.style.overflow = 'visible';
    }
  };
  
  html2canvas(element, options).then(canvas => {
    canvas.toBlob(blob => {
      if (!blob) {
        showAlert('Failed to process screenshot image.');
        return;
      }
      
      const file = new File([blob], `bracket-${fileName}.png`, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: titleText,
          text: `Check out the latest ${titleText}!`
        }).catch(() => {});
      } else {
        const link = document.createElement('a');
        link.download = `bracket-${fileName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }, 'image/png');
  }).catch((err) => {
    console.error(err);
    showAlert('Could not take screenshot');
  });
}











document.addEventListener("DOMContentLoaded", enableSwipeForRounds);


// RUN ON PAGE LOAD
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const viewId = urlParams.get('view');
  
  if (viewId) {
    // VIEWER MODE - load from cloud
    await loadTournamentFromCloud(viewId);
    // Auto refresh every 30 seconds
    setInterval(() => loadTournamentFromCloud(viewId), 30000);
  } else {
   renderTournamentList();
  }
});

async function loadTournamentFromCloud(id) {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${id}/latest`);
    if (!res.ok) throw new Error("Tournament not found online");
    const data = await res.json();
    const cloudData = data.record;
    
    // Load tournament into memory
    setCurrentTournamentId(cloudData.id);
    
    // Load logos into IndexedDB for this session
    if (cloudData.logos) {
      const dbReq = indexedDB.open("tourmakerDB", 1);
      dbReq.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction("logos", "readwrite");
        const store = tx.objectStore("logos");
        for (let team in cloudData.logos) {
          store.put(cloudData.logos[team], cloudData.tournament.teamLogos[team]);
        }
      }
    }
    
    openTournament(cloudData.id); // Reuse your existing function
    console.log("✅ Loaded from cloud, version:", cloudData.version);
  } catch (err) {
    showAlert("Could not load tournament: " + err.message);
  }
}