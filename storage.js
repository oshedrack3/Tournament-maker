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
  showActionModal("⏳ Publishing to cloud...", "loading");
  
  // 1. Get logos from IndexedDB
  const logos = {};
  if (t.teamLogos) {
    for (let team in t.teamLogos) {
      const key = t.teamLogos[team];
      const logo = await getLogoFromIndexedDB(key);
      if (logo) logos[team] = logo;
    }
  }
  
  // 2. Build payload
  const payload = {
    id: t.id,
    name: t.name,
    version: Date.now(),
    tournament: t,
    logos: logos
  };
  
  // 3. Call our secure Netlify Function
  try {
    const res = await fetch('/.netlify/functions/publish-bin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, payload: payload })
    });
    
    const result = await res.json();
    
    if (res.ok) {
      const viewLink = `${window.location.origin}?view=${t.id}`;
      showActionModal(`✅ Published!<br><br>Share this link:<br><input value="${viewLink}" readonly onclick="this.select()" style="width:100%">`, "publish");
      navigator.clipboard.writeText(viewLink);
      console.log("Published to JSONBin:", result);
    } else {
      throw new Error(result.error || "Unknown error");
    }
  } catch (err) {
    showAlert("Publish failed: " + err.message);
    console.error(err);
  }
}

// Helper to read logo from IndexedDB
function getLogoFromIndexedDB(key) {
  return new Promise((resolve) => {
    const req = indexedDB.open("tourmakerDB", 1);
    req.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction("logos", "readonly");
      const store = tx.objectStore("logos");
      const getReq = store.get(key);
      getReq.onsuccess = () => resolve(getReq.result);
    };
    req.onerror = () => resolve(null);
  });
}


async function loadTournamentFromCloud(id) {
  showActionModal("⏳ Loading tournament from cloud...", "loading"); // Show loader
  
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${id}/latest`);
    if (!res.ok) throw new Error(`Tournament not found. Code: ${res.status}`);
    
    const data = await res.json();
    const cloudData = data.record;
    
    if (!cloudData || !cloudData.tournament) {
      throw new Error("Invalid tournament data");
    }
    
    // 1. Load tournament into localStorage so rest of app works
    saveTournament(cloudData.tournament);
    setCurrentTournamentId(cloudData.id);
    
    // 2. Load logos into IndexedDB for this session
    if (cloudData.logos && Object.keys(cloudData.logos).length > 0) {
      const dbReq = indexedDB.open("tourmakerDB", 1);
      dbReq.onupgradeneeded = (e) => { // create store if doesn't exist
        e.target.result.createObjectStore("logos");
      };
      dbReq.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction("logos", "readwrite");
        const store = tx.objectStore("logos");
        for (let team in cloudData.logos) {
          const logoKey = cloudData.tournament.teamLogos[team];
          if (logoKey) store.put(cloudData.logos[team], logoKey);
        }
      }
    }
    
    // 3. Open it using your existing function
    openTournament(cloudData.id);
    document.getElementById("actionModal").style.display = "none"; // Hide loader
    console.log("✅ Loaded from cloud, version:", cloudData.version);
    
  } catch (err) {
    document.getElementById("actionModal").style.display = "none"; // Hide loader
    showAlert("Could not load tournament: " + err.message);
    console.error("Cloud Load Error:", err);
  }
}



