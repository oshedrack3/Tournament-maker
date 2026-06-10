function showAlert(message) {
  const modal = document.getElementById("alertModal");
  const text = document.getElementById("alertText");
  
  text.textContent = message;
  modal.style.display = "flex";
}

function closeAlert() {
  const modal = document.getElementById("alertModal");
  modal.style.display = "none";
}

let inputCallback = null;

function showInputModal(title, callback) {
  document.getElementById("inputTitle").textContent = title;
  document.getElementById("modalInput").value = "";
  document.getElementById("inputModal").style.display = "flex";
  
  inputCallback = callback;
}

function submitModalInput() {
  const value = document.getElementById("modalInput").value;
  closeInputModal();
  
  if (inputCallback) {
    inputCallback(value);
  }
}

function closeInputModal() {
  document.getElementById("inputModal").style.display = "none";
}


function showActionModal(message, type = "") {
  const modal = document.getElementById("actionModal");
  
  modal.textContent = message;
  modal.className = "action-modal";
  
  if (type) modal.classList.add(type);
  
  modal.classList.add("show");
  
  setTimeout(() => modal.classList.remove("show"), 1200);
}





let confirmCallback = null;

function showConfirmModal(message, callback) {
  document.getElementById("confirmText").textContent = message;
  document.getElementById("confirmModal").style.display = "flex";
  
  confirmCallback = callback;
}

function confirmYes() {
  document.getElementById("confirmModal").style.display = "none";
  
  if (confirmCallback) {
    confirmCallback(true);
  }
}

function confirmNo() {
  document.getElementById("confirmModal").style.display = "none";
  confirmCallback = null; // Just clear it out and do nothing else!
}


function handleGenerateFixtures() {
  const tournament = getCurrentTournament();
  if (!tournament) {
    showAlert("No tournament found");
    return;
  }
  
  if (tournament.matches && tournament.matches.length > 0) {
    showConfirmModal("Fixtures already exist. Delete and regenerate?", (confirmed) => {
      if (!confirmed) return;
      
      deleteFixtures(true);
      proceedToInput(); // continue flow
    });
  } else {
    proceedToInput(); // no fixtures → go ahead
  }
}


function proceedToInput() {
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


function populateTeamDropdowns() {
  const tournament = getCurrentTournament();
  if (!tournament) return;

  const home = document.getElementById("homeTeam");
  const away = document.getElementById("awayTeam");

  home.innerHTML = "";
  away.innerHTML = "";

  tournament.teams.forEach(team => {
    const opt1 = document.createElement("option");
    const opt2 = document.createElement("option");

    opt1.value = opt2.value = team;
    opt1.textContent = opt2.textContent = team;

    home.appendChild(opt1);
    away.appendChild(opt2);
  });
}



function getAllTournaments() {
  return JSON.parse(localStorage.getItem("tournaments") || "[]");
}

function removeTournament(id) {
  let tournaments = getAllTournaments();
  tournaments = tournaments.filter(t => t.id !== id);
  localStorage.setItem("tournaments", JSON.stringify(tournaments));
}

function deleteTournament(id) {
  const tournaments = getAllTournaments();
  const tournament = tournaments.find(t => t.id === id);
  
  if (!tournament) {
    showAlert("Tournament not found.");
    return;
  }
  
  
  showConfirmModal(
    `Delete "${tournament.name}" permanently? This cannot be undone.`,
    () => {
      removeTournament(id);
    showActionModal("❌ Tournament Deleted", "delete");
      renderTournamentList(); 
      
    }
  );
}



function showCreateTournament() {
  document.getElementById("createTour").style.display = "block";
}

function hideCreateTournament() {
  document.getElementById("createTour").style.display = "none";
}

function openCreateTournament() {
  document.getElementById("createTour").style.display = "block";
}