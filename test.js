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
        `knockout-${fileName}.png`,
        { type: 'image/png' }
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

