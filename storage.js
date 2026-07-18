const ADMIN_PASSWORD = "tour2026"; // change this

async function checkAdmin() {
  const pass = prompt("Enter Admin Password to Publish:");
  if (pass === ADMIN_PASSWORD) {
    return true;
  } else if (pass !== null) {
    showAlert("❌ Wrong password");
    return false;
  }
  return false;
}




const STORE = "tournaments";

function getTournaments() {
  try {
    const data = localStorage.getItem(STORE);
    const result = data ? JSON.parse(data) : [];
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return [];
  }
}

function saveAllTournaments(tournamentsArray) {
  try {
    localStorage.setItem(STORE, JSON.stringify(tournamentsArray));
    return true;
  } catch (error) {
    console.error("Error writing to localStorage:", error);
    return false;
  }
}

function getTournament(id) {
  const tournaments = getTournaments();
  const idStr = String(id);
  return tournaments.find(t => String(t.id) === idStr) || null;
}

function updateTournament(updatedTournament) {
  if (!updatedTournament || !updatedTournament.id) {
    console.error("❌ updateTournament ERROR: Invalid tournament object");
    return;
  }
  
  const tournaments = getTournaments();
  const index = tournaments.findIndex(
    t => String(t.id) === String(updatedTournament.id)
  );
  
  if (index !== -1) {
    tournaments[index] = updatedTournament;
  } else {
    tournaments.push(updatedTournament);
  }
  
  saveAllTournaments(tournaments);
}

function saveTournament(tournament) {
  console.log("🟡 saveTournament called with:", tournament);
  
  if (!tournament) {
    console.error("❌ saveTournament ERROR: tournament is null/undefined");
    return false;
  }
  if (!tournament.id) {
    console.error("❌ saveTournament ERROR: missing tournament.id", tournament);
    return false;
  }
  
  const tournaments = getTournaments();
  const index = tournaments.findIndex(t => String(t.id) === String(tournament.id));
  
  if (index !== -1) {
    tournaments[index] = tournament;
  } else {
    tournaments.push(tournament);
  }
  
  const success = saveAllTournaments(tournaments);
  if (success) console.log("🟢 Tournament saved successfully:", tournament.id);
  return success;
}

function deleteTournament(id) {
  const tournaments = getTournaments();
  const idStr = String(id);
  const filtered = tournaments.filter(t => String(t.id) !== idStr);
  
  return saveAllTournaments(filtered);
}

function clearAllTournaments() {
  try {
    localStorage.removeItem(STORE);
    return true;
  } catch (error) {
    console.error("Error clearing tournaments:", error);
    return false;
  }
}

let currentTournamentId = null;

function getCurrentTournamentId() {
  return currentTournamentId;
}

function setCurrentTournamentId(id) {
  currentTournamentId = id ? String(id) : null;
}

function getCurrentTournament() {
  if (!currentTournamentId) return null;
  return getTournament(currentTournamentId);
}

function openTournament(id) {
  showActionModal("Opening...", "success");
  
  const idStr = String(id).trim();
  setCurrentTournamentId(idStr);
  
  const tournament = getCurrentTournament();
  
  if (!tournament) {
    showAlert("Tournament not found");
    return;
  }
  
  const name = tournament.name;
  const formatType = (tournament.format || "league").toLowerCase();
  
  if (formatType === "league") {
    const el = document.getElementById("leagueName");
    if (el) el.textContent = name;
    goToTournamentPage();
    backfillPlayedAtOnce(tournament);
  } else {
    const el = document.getElementById("cupName");
    if (el) el.textContent = name;
    goToCupPage();
  }
}


async function publishTournament() {
  if (!await checkAdmin()) return;
  
  const t = getCurrentTournament();
  if (!t) return showAlert("No tournament loaded");
  
  showActionModal("⏳ Publishing...", "loading");
  
  // Ensure ID exists
  if (!t.id) t.id = Date.now().toString();
  
  // 1. Get logos from IndexedDB
  const logos = {};
  if (t.teamLogos) {
    for (let team in t.teamLogos) {
      const key = t.teamLogos[team];
      const logo = await getLogoFromIndexedDB(key);
      if (logo) logos[team] = logo;
    }
  }
  
  // 2. Build payload (same structure you were using)
  const payload = {
    id: t.id,
    name: t.name,
    version: Date.now(),
    tournament: t,
    logos: logos
  };
  
  try {
    // 3. Send to YOUR backend
    const res = await fetch("https://tour-backend-vohh.onrender.com/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error("Failed to publish");
    
    const viewLink = `${window.location.origin}?view=${t.id}`;
    
    showActionModal(
      `✅ Published!<br><br>Share this link:<br>
      <input value="${viewLink}" readonly onclick="this.select()" style="width:100%">`,
      "publish"
    );
    
    navigator.clipboard.writeText(viewLink);
    
    console.log("✅ Published to backend:", payload);
    
  } catch (err) {
    showAlert("Publish failed: " + err.message);
    console.error(err);
  }
}

async function loadTournamentFromCloud(id) {
  showActionModal("⏳ Loading tournament...", "loading");
  
  try {
    const res = await fetch(`https://tour-backend-vohh.onrender.com/tournaments/${id}`);
    
    if (!res.ok) throw new Error(`Tournament not found (${res.status})`);
    
    const cloudData = await res.json();
    
    if (!cloudData || !cloudData.tournament) {
      throw new Error("Invalid tournament data");
    }
    
    // 1. Save into localStorage
    saveTournament(cloudData.tournament);
    setCurrentTournamentId(cloudData.id);
    
    // 2. Load logos into IndexedDB
    if (cloudData.logos && Object.keys(cloudData.logos).length > 0) {
      const dbReq = indexedDB.open("tourmakerDB", 1);
      
      dbReq.onupgradeneeded = (e) => {
        e.target.result.createObjectStore("logos");
      };
      
      dbReq.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction("logos", "readwrite");
        const store = tx.objectStore("logos");
        
        for (let team in cloudData.logos) {
          const logoKey = cloudData.tournament.teamLogos?.[team];
          if (logoKey) {
            store.put(cloudData.logos[team], logoKey);
          }
        }
      };
    }
    
    // 3. Open tournament
    openTournament(cloudData.id);
    
    document.getElementById("actionModal").style.display = "none";
    
    console.log("✅ Loaded from backend, version:", cloudData.version);
    
  } catch (err) {
    document.getElementById("actionModal").style.display = "none";
    showAlert("Could not load tournament: " + err.message);
    console.error("Load Error:", err);
  }
}




