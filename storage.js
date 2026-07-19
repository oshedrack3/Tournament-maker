const ADMIN_PASSWORD = "tour2026"

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



async function collectMissingLogos(tournament) {
  const logosToUpload = {};
  
  for (let team in tournament.teamLogos) {
    const key = tournament.teamLogos[team];
    
    if (!key.startsWith("http")) {
      const base64 = await getLogoFromIndexedDB(key);
      if (base64) {
        logosToUpload[team] = base64;
      }
    }
  }
  
  return logosToUpload;
}


async function publishTournament() {
  if (window.isPublishing) return;
  window.isPublishing = true;
  
  if (!await checkAdmin()) {
    window.isPublishing = false;
    return;
  }
  
  const t = getCurrentTournament();
  if (!t) {
    window.isPublishing = false;
    return showAlert("No tournament loaded");
  }
  
  const isUpdate = !!t.published;
  
  showActionModal(
    isUpdate ? "🔄 Updating..." : "⏳ Publishing...",
    "loading"
  );
  
  if (!t.id) t.id = Date.now().toString();
  
  const payload = {
    id: t.id,
    name: t.name,
    version: Date.now(),
    mode: isUpdate ? "update" : "create",
    tournament: t
  };
  
  const jsonString = JSON.stringify(payload);
  const sizeMB = new Blob([jsonString]).size / 1024 / 1024;
  
  if (sizeMB > 5) {
    window.isPublishing = false;
    return showAlert("❌ Tournament too large. Reduce data.");
  }
  
  try {
    const file = new Blob([jsonString], { type: "application/json" });
    const formData = new FormData();
    
    formData.append("tournament", file, "tournament.json");
    
    const logos = await collectMissingLogos(t);
    if (logos && logos.length) {
      logos.forEach((logo, i) => {
        formData.append(`logo_${i}`, logo.file || logo);
      });
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const res = await fetch(
      "https://tour-backend-vohh.onrender.com/tournaments/upload",
      {
        method: "POST",
        body: formData,
        signal: controller.signal,
        headers: {
          "x-admin-key": "YOUR_SECRET_KEY"
        }
      }
    );
    
    clearTimeout(timeout);
    
    const responseText = await res.text();
    
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}: ${responseText}`);
    }
    
    let result = {};
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {}
    
    // mark as published after success
    t.published = true;
    
    const viewLink = `${window.location.origin}?view=${t.id}`;
    
    showAlert(
      `✅ ${isUpdate ? "Updated" : "Published"}!<br><br>Share this link:<br>
      <input id="shareLink" value="${viewLink}" readonly onclick="this.select()" style="width:100%">
      <button onclick="copyLink()">Copy</button>`,
      "publish"
    );
    
    try {
      await navigator.clipboard.writeText(viewLink);
    } catch {}
    
    console.log(`✅ ${isUpdate ? "Updated" : "Published"} result:`, result);
    
  } catch (err) {
    showAlert((isUpdate ? "Update" : "Publish") + " failed: " + err.message);
    console.error("Publish Error:", err);
  } finally {
    window.isPublishing = false;
  }
}

function copyLink() {
  const input = document.getElementById("shareLink");
  input.select();
  document.execCommand("copy");
}

function openPublicTournament(tournament) {
  
  const name = tournament.name;
  const formatType = (tournament.format || "league").toLowerCase();
  
  
  
  if (formatType === "league") {
    
    const el = document.getElementById("leagueName");
    if (el) el.textContent = name;
    
    goToTournamentPage();
    
  } else {
    
    const el = document.getElementById("cupName");
    if (el) el.textContent = name;
    
    goToCupPage();
  }
  
  
  
  currentTournament = tournament;
  
  renderFixtures();
  
  
}


async function loadTournamentFromCloud(id) {
  showActionModal("⏳ Loading tournament...", "success");
  
  try {
    const res = await fetch(
      `https://tour-backend-vohh.onrender.com/tournaments/${id}`
    );
    
    if (!res.ok) {
      throw new Error(`Tournament not found (${res.status})`);
    }
    
    const cloudData = await res.json();
    
    if (!cloudData || !cloudData.tournament) {
      throw new Error("Invalid tournament data");
    }
    
    
    
    saveTournament(cloudData.tournament);
    
    setCurrentTournamentId(cloudData.id);
    
    
    
    if (cloudData.logos && Object.keys(cloudData.logos).length > 0) {
      
      const dbReq = indexedDB.open("tourmakerDB", 1);
      
      dbReq.onupgradeneeded = (e) => {
        const db = e.target.result;
        
        if (!db.objectStoreNames.contains("logos")) {
          db.createObjectStore("logos");
        }
      };
      
      
      dbReq.onsuccess = (e) => {
        
        const db = e.target.result;
        
        const tx = db.transaction(
          "logos",
          "readwrite"
        );
        
        const store = tx.objectStore("logos");
        
        
        for (let team in cloudData.logos) {
          
          const logoKey =
            cloudData.tournament.teamLogos?.[team];
          
          if (logoKey) {
            store.put(
              cloudData.logos[team],
              logoKey
            );
          }
        }
        
      };
    }
    
    
    
    openPublicTournament(cloudData.tournament);
    
    
    
    console.log(
      "✅ Loaded from backend:",
      cloudData.version
    );
    
    
  } catch (err) {
    
    
    
    
    
    showAlert(
      "Could not load tournament: " + err.message
    );
    
    
    console.error(
      "Load Error:",
      err
    );
  }
}