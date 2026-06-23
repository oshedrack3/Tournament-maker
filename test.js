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
    
    // Update the inputs so user sees what was entered
    document.getElementById('dateResetHome').value = homeTeam.trim();
    document.getElementById('dateResetAway').value = awayTeam.trim();
  }
  
  // Validate match exists
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