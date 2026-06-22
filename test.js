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








