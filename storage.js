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




