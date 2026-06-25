const PAGES = [
  "tournamentPage",
  "tablePage",
  "formViewPage",
  "fixturePage",
  "cupPage",
  "recordsView",
  "tablePageHead",
  "fixturePageHead",
  "nav",
  "cupHome",
  "cupTab",
  "teamView"
  
  
  
];

function hideAllPages() {
  PAGES.forEach(id => {
    const pageElement = document.getElementById(id);
    if (pageElement) {
      pageElement.style.display = "none";
    }
  });
}

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
  confirmCallback = null;
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
      proceedToInput();
    });
  } else {
    proceedToInput();
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


function getAllTournaments() {
  return JSON.parse(localStorage.getItem("tournaments") || "[]");
}

function removeTournament(id) {
  let tournaments = getAllTournaments();
  tournaments = tournaments.filter(t => t.id !== id);
  localStorage.setItem("tournaments", JSON.stringify(tournaments));
}

async function removeTournament(id) {
  const idStr = String(id).trim();
  
  try {
    let tournaments = JSON.parse(localStorage.getItem("tournaments") || "[]");
    
    tournaments = tournaments.filter(t => t.id !== idStr);
    
    localStorage.setItem("tournaments", JSON.stringify(tournaments));
    
    if (typeof allTournaments !== "undefined") {
      allTournaments = tournaments;
    }
    
    if (currentTournament && currentTournament.id === idStr) {
      currentTournament = null;
      localStorage.removeItem("currentTournamentId");
    }
    
    console.log("[LOCAL] Deleted tournament:", idStr);
  } catch (err) {
    console.error("[LOCAL] Delete failed:", err);
    showAlert("Failed to delete tournament: " + err.message);
  }
}



async function deleteTournament(id) {
  const tournaments = getAllTournaments();
  const tournament = tournaments.find(t => t.id === String(id));
  
  if (!tournament) {
    showAlert("Tournament not found.");
    return;
  }
  
  showConfirmModal(
    `Delete "${tournament.name}" permanently? This cannot be undone.`,
    async () => {
      await removeTournament(id);
      showActionModal("❌ Tournament Deleted", "delete");
      renderTournamentList();
      if (typeof renderFixtures === "function") renderFixtures();
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


let activeInput = null;

document.getElementById('homeGoals').addEventListener('focus', () => openNumpad('homeGoals'));
document.getElementById('awayGoals').addEventListener('focus', () => openNumpad('awayGoals'));


function openNumpad(inputId) {
  activeInput = document.getElementById(inputId);
  
  document.getElementById("homeGoals").classList.remove("active");
  document.getElementById("awayGoals").classList.remove("active");
  
  activeInput.classList.add("active");
  
  document.getElementById("numpad").classList.remove("hidden");
}


function pressNum(n) {
  if (!activeInput) return;
  activeInput.value = (activeInput.value || '') + n;
}

function clearNum() {
  if (!activeInput) return;
  activeInput.value = '';
}

function goToCupPage() {
  document.getElementById("listOfTournamentPage").style.display = "none";
  hideAllPages();
  document.getElementById("tournamentPage").style.display = "block";
  document.getElementById("cupSchedule").style.display = "block";
  document.getElementById("tourListPageHead").style.display = "none";
  document.getElementById("cupPage").style.display = "block";
  renderCupFixtures();
  document.getElementById("cupPageHead").style.display = "flex";
  document.getElementById("cupHome").style.display = "flex";
  
  const tournament = getCurrentTournament();
  if (tournament) {
    renderCupTables();
    renderCupFixtures()
    toggleCupView("tables");
  }
  
}


function openTournamentPage() {
  const format = localStorage.getItem("currentTournamentFormat");
  
  if (!format) {
    showAlert("No tournament open");
    return;
  }
  
  if (format === "league") {
    goToTournamentPage();
  } else {
    goToCupPage();
  }
}


function closeResultRecord() {
  document.getElementById("resultRecord").style.display = "none";
  
  document.getElementById("homeGoals").classList.remove("active");
  document.getElementById("awayGoals").classList.remove("active");
  
  activeInput = null;
}



function setActiveNav(buttonId) {
  document
    .querySelectorAll(".bottom-nav button")
    .forEach(btn => btn.classList.remove("active"));
  
  document.getElementById(buttonId)?.classList.add("active");
}


function openLeagueRecorder(match) {
  if (!match) return;
  
  document.getElementById("homeTeam").textContent = match.home;
  document.getElementById("awayTeam").textContent = match.away;
  
  document.getElementById("homeGoals").value =
    match.played ? match.homeGoals : "";
  
  document.getElementById("awayGoals").value =
    match.played ? match.awayGoals : "";
  
  document.getElementById("resultRecord").style.display = "block";
  
  activeInput = "homeGoals";
  
  document.getElementById("homeGoals").classList.add("active");
  document.getElementById("awayGoals").classList.remove("active");
  
  document.getElementById("numpad").classList.remove("hidden");
}

const logoInput = document.getElementById("teamLogoInput");
const logoPreview = document.getElementById("teamLogoPreview");

logoInput.addEventListener("change", function() {
  const file = this.files[0];
  
  if (!file) {
    logoPreview.src = "";
    logoPreview.classList.remove("show");
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    logoPreview.src = e.target.result;
    logoPreview.classList.add("show");
  };
  
  reader.readAsDataURL(file);
});


function toggleView(view) {
  const tableView = document.getElementById("tableView");
  const formView = document.getElementById("formView");
  const recordsView = document.getElementById("recordsView");
  const teamView = document.getElementById("teamView");
  
  const views = [tableView, formView, recordsView, teamView];
  
  views.forEach(v => {
    if (!v) return;
    v.style.display = "none";
  });
  
  document.querySelectorAll(".btn-tablePage button").forEach(btn => {
    btn.classList.remove("active");
  });
  
  const activeBtn =
    document.querySelector(`[data-view="${view}"]`) ||
    document.getElementById(`${view}Btn`);
  
  if (activeBtn) activeBtn.classList.add("active");
  
  currentView = view;
  
  let activeView = null;
  
  if (view === "table") {
    activeView = tableView;
  } else if (view === "form") {
    activeView = formView;
    renderFormView();
  } else if (view === "records") {
    activeView = recordsView;
    renderRecords();
  } else if (view === "team") {
    activeView = teamView;
    renderTeams();
  }
  
  if (!activeView) return;
  
  activeView.style.display = "block";
}



let currentPage = null;

function setPageAndToggleMenu(page) {
  currentPage = page;
  toggleMenu();
}


function closeMenu() {
  const menu = document.getElementById("sideMenu");
  const overlay = document.getElementById("menuOverlay");
  
  menu.classList.remove("open");
  overlay.classList.remove("active");
}


function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  const overlay = document.getElementById("menuOverlay");
  
  menu.classList.toggle("open");
  overlay.classList.toggle("active");
  
  if (menu.classList.contains("open")) {
    renderMenu();
  }
}



function renderMenu() {
  const menu = document.getElementById("sideMenu");
  const items = menuConfig[currentPage] || [];
  
  menu.innerHTML = `
    <div class="menu-header">
      ${currentPage? currentPage.toUpperCase() : "MENU"}
    </div>

    ${items.map(item => `
      <button class="menu-item" onclick="handleMenuAction('${item.action}')">
        ${item.label}
      </button>
    `).join("")}
  `;
}

function handleMenuAction(action) {
  closeMenu();
  
  const actions = {
    addTeam: openAddTeam,
    importTeams: importTeams,
    deleteTeam: deleteTeamInfo,
    createTournament: openCreateTournament,
    enableExportMode: enableExportMode,
    newCup: openCupBox,
    importTournament: openImportTournament,
    openTournament: openTournamentInfo,
    deleteTournament: deleteTournamentInfo,
    shareGroupTable: shareCupTable,
    
    deleteCupTeam: deleteCupTeamInfo
    
    
  };
  
  actions[action]?.();
}

const menuConfig = {
  cup: [
    {
      label: "Start New Tournament",
      action: "newCup"
    },
    
    { label: "Register New Teams", action: "addTeam" },
    { label: "Import Teams", action: "importTeams" },
    { label: "Delete or Edit Team", action: "deleteCupTeam" }
  ],
  
  league: [
    { label: "Register New Teams", action: "addTeam" },
    { label: "Import Teams", action: "importTeams" },
    { label: "Edit or Delete Team", action: "deleteTeam" }
  ],
  tournaments: [
    { label: "Open Tournament", action: "openTournament" },
    { label: "Create New Tournament", action: "createTournament" },
    { label: "Import Tournament", action: "importTournament" },
    { label: "Export Tournament", action: "enableExportMode" },
    { label: "Delete Tournament", action: "deleteTournament" }
    
  ]
};

function openAddTeam() {
  toggleView('team');
  closeMenu();
  document.getElementById("addNewTeam").style.display = "block";
  
}

function closeAddTeam() {
  document.getElementById("addNewTeam").style.display = "none";
  toggleView('team');
}


function deleteTeamInfo() {
  closeMenu();
  showAlert("Swap to the left on  the team you want to delete or edit");
  
  toggleView("team");
}


function deleteCupTeamInfo() {
  closeMenu();
  toggleCupView("cupBox");
  toggleCupSetUpView("teams")
  showAlert("Swap to the left on the Team  to show the  Edit and Delete Team button");
  
  
}


function deleteTournamentInfo() {
  closeMenu();
  showAlert("Click on the menu icon on the tornament to see the delete button");
  
}

function openTournamentInfo() {
  
  showAlert("Click on the tournament You want to Open");
  closeMenu();
}



function openCupBox() {
  
  closeMenu();
  toggleCupView('cupBox');
  
}


function openImportTournament() {
  document.getElementById("importTournamentInput").click();
}


function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    if (e.target?.result) {
      await importTournamentsData(e.target.result);
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}


let exportMode = false;
let selectedTournaments = [];


function enableExportMode() {
  exportMode = true;
  selectedTournaments = [];
  
  document.getElementById("confirmExportBtn").style.display = "inline-flex";
  document.getElementById("exitExportBtn").style.display = "inline-flex";
  
  
  showAlert("Tap tournaments to select then export")
  
  renderTournamentList();
}

function exitExportMode() {
  exportMode = false;
  selectedTournaments = [];
  
  document.getElementById("confirmExportBtn").style.display = "none";
  document.getElementById("exitExportBtn").style.display = "none";
  
  
  renderTournamentList();
}


function toggleSelect(id) {
  if (selectedTournaments.includes(id)) {
    selectedTournaments = selectedTournaments.filter(t => t !== id);
  } else {
    selectedTournaments.push(id);
  }
  
  renderTournamentList();
}


async function exportSelectedTournaments() {
  const tournaments = getTournaments();
  
  const selected = tournaments.filter(t =>
    selectedTournaments.includes(t.id)
  );
  
  if (selected.length === 0) {
    showAlert("No tournaments selected");
    return;
  }
  
  // Deep clone the selected data so we don't accidentally pollute our current runtime state
  const exportData = JSON.parse(JSON.stringify(selected));
  
  // Loop through the clone and embed the real base64 images from IndexedDB
  for (const tournament of exportData) {
    if (tournament.teamLogos) {
      const teams = Object.keys(tournament.teamLogos);
      for (const team of teams) {
        const logoKey = tournament.teamLogos[team];
        
        // If it is an IndexedDB tracking key, grab the raw image text string
        if (logoKey && !logoKey.startsWith("data:image")) {
          try {
            const base64Data = await getLogoFromIndexedDB(logoKey);
            if (base64Data) {
              // Temporarily pack the heavy image data back into the exported map
              tournament.teamLogos[team] = base64Data;
            }
          } catch (err) {
            console.error(`Failed to package logo for team ${team}:`, err);
          }
        }
      }
    }
  }
  
  const blob = new Blob(
    [JSON.stringify(exportData, null, 2)], { type: "application/json" }
  );
  
  const file = new File(
    [blob],
    `tournaments-${selected.length}.json`, { type: "application/json" }
  );
  
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({
      title: "Tournaments Export",
      text: "Selected tournaments backup",
      files: [file]
    });
  } else {
    fallbackDownload(file);
  }
  
  exitExportMode();
}

function fallbackDownload(file) {
  const url = URL.createObjectURL(file);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
  
  showAlert("File downloaded");
}

function openListModal(title, html) {
  document.getElementById("listModalTitle").textContent = title;
  document.getElementById("listModalContent").innerHTML = html;
  
  document.getElementById("listModal").style.display = "flex";
}

function closeListModal() {
  document.getElementById("listModal").style.display = "none";
}


function getTournamentTeams(tournamentId) {
  const tournaments = getTournaments();
  
  const tournament = tournaments.find(
    t => String(t.id) === String(tournamentId)
  );
  
  return tournament?.teams || [];
}

function getImportSources() {
  const currentId = localStorage.getItem("currentTournamentId");
  
  return getTournaments().filter(
    t => String(t.id) !== String(currentId)
  );
}

function openListModal(title, contentHTML) {
  const modal = document.getElementById("listModal");
  const titleEl = document.getElementById("listModalTitle");
  const contentEl = document.getElementById("listModalContent");
  
  if (!modal || !titleEl || !contentEl) return;
  
  titleEl.textContent = title;
  contentEl.innerHTML = contentHTML;
  modal.style.display = "flex";
}

function closeListModal() {
  const modal = document.getElementById("listModal");
  if (modal) modal.style.display = "none";
}


async function importTournamentsData(jsonString) {
  try {
    const importedData = JSON.parse(jsonString);
    if (!importedData) {
      showAlert("Invalid backup file structure");
      return;
    }
    
    const tournamentsList = Array.isArray(importedData) ? importedData : [importedData];
    const existingTournaments = getTournaments();
    
    let successCount = 0;
    
    for (const tournament of tournamentsList) {
      if (!tournament.id || !tournament.name) continue;
      
      const duplicateIndex = existingTournaments.findIndex(t => String(t.id) === String(tournament.id));
      if (duplicateIndex !== -1) continue;
      
      if (tournament.teamLogos) {
        const teams = Object.keys(tournament.teamLogos);
        
        for (const team of teams) {
          const logoData = tournament.teamLogos[team];
          
          if (logoData && (logoData.startsWith("data:image") || logoData.length > 100)) {
            const logoKey = `logo_${tournament.id}_${team.replace(/\s+/g, '_')}`;
            
            try {
              await saveLogoToIndexedDB(logoKey, logoData);
              tournament.teamLogos[team] = logoKey;
            } catch (dbErr) {
              tournament.teamLogos[team] = null;
            }
          } else {
            tournament.teamLogos[team] = null;
          }
        }
      }
      
      existingTournaments.push(tournament);
      successCount++;
    }
    
    if (successCount > 0) {
      localStorage.setItem("tournaments", JSON.stringify(existingTournaments));
      showAlert(`Successfully imported ${successCount} tournament(s)!`);
      
      if (typeof renderTournamentList === "function") renderTournamentList();
      if (typeof renderTeams === "function") renderTeams();
    } else {
      showAlert("No new or unique tournaments were imported.");
    }
    
  } catch (err) {
    showAlert("Failed to interpret data file structure.");
  }
}

function handleTournamentFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    await importTournamentsData(e.target.result);
    event.target.value = "";
  };
  reader.readAsText(file);
}


function importTeams() {
  const currentId = localStorage.getItem("currentTournamentId");
  
  const tournaments = getTournaments().filter(
    t => String(t.id) !== String(currentId)
  );
  
  if (!tournaments.length) {
    showAlert("No tournaments available");
    return;
  }
  
  const html = tournaments
    .map(
      t => `
        <button
          type="button"
          class="list-item-btn"
          data-id="${t.id}"
        >
          ${t.name}
        </button>
      `
    )
    .join("");
  
  openListModal("Import Teams From", html);
}

document.addEventListener("click", function(e) {
  const btn = e.target.closest(".list-item-btn");
  if (!btn) return;
  
  const sourceId = btn.dataset.id;
  
  console.log("Import clicked:", sourceId);
  
  importAllTeamsFromTournament(sourceId);
});

async function importAllTeamsFromTournament(sourceId) {
  const current = getCurrentTournament();
  const source = getTournaments().find(
    t => String(t.id) === String(sourceId)
  );
  
  if (!current || !source) {
    console.warn("Missing tournament:", { current, source });
    return;
  }
  
  current.teams = current.teams || [];
  current.teamLogos = current.teamLogos || {};
  
  let importedCount = 0;
  const importPromises = [];
  
  source.teams.forEach(team => {
    if (!current.teams.includes(team)) {
      current.teams.push(team);
      
      const sourceLogoKey = source.teamLogos?.[team];
      
      if (sourceLogoKey) {
        // Create a distinct, isolated key for the current tournament destination
        const currentLogoKey = `logo_${current.id}_${team.replace(/\s+/g, '_')}`;
        current.teamLogos[team] = currentLogoKey;
        
        
        const promise = getLogoFromIndexedDB(sourceLogoKey)
          .then(base64Data => {
            if (base64Data) {
              return saveLogoToIndexedDB(currentLogoKey, base64Data);
            }
          })
          .catch(err => console.error(`Failed to migrate logo for ${team}:`, err));
        
        importPromises.push(promise);
      }
      
      importedCount++;
    }
  });
  
  try {
    
    await Promise.all(importPromises);
    
    updateTournament(current);
    closeListModal();
    showAlert(`${importedCount} team(s) imported securely`);
    
    if (typeof renderTeams === "function") {
      renderTeams();
    }
  } catch (err) {
    console.error("Error finalizing team import:", err);
    showAlert("Failed to safely import team logos");
  }
}


function removeBackground(file, callback) {
  const img = new Image();
  
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    
    callback(canvas.toDataURL("image/png"));
  };
  
  img.src = URL.createObjectURL(file);
}



let editingIndex = null;

function openEditTeam(index) {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  editingIndex = index;
  const currentName = tournament.teams[index];
  
  document.getElementById("editTitle").textContent = "Edit Team";
  document.getElementById("editNameInput").value = currentName;
  document.getElementById("editLogoInput").value = "";
  
  document.getElementById("editModal").classList.add("show");
}

function closeEditModal() {
  editingIndex = null;
  document.getElementById("editModal").classList.remove("show");
  document.getElementById("editNameInput").value = "";
  document.getElementById("editLogoInput").value = "";
  const preview = document.getElementById("logoPreview");
  
  preview.src = "";
  renderTeams("cupTeamsContainer");
  preview.style.display = "none";
}


document.getElementById("editLogoInput").addEventListener("change", function(e) {
  const file = e.target.files[0];
  const preview = document.getElementById("logoPreview");
  
  if (file) {
    const reader = new FileReader();
    
    reader.onload = function(event) {
      preview.src = event.target.result;
      preview.style.display = "block";
    };
    
    reader.readAsDataURL(file);
  } else {
    preview.src = "";
    preview.style.display = "none";
  }
});


async function saveEdit() {
  const tournament = getCurrentTournament();
  if (!tournament || editingIndex === null) {
    showAlert("Something went wrong. Please try again");
    return;
  }
  
  const newName = document.getElementById("editNameInput").value.trim();
  const fileInput = document.getElementById("editLogoInput");
  const oldName = tournament.teams[editingIndex];
  
  if (!newName) {
    showAlert("Team name cannot be empty");
    return;
  }
  
  if (newName !== oldName && tournament.teams.includes(newName)) {
    showAlert("A team with this name already exists");
    return;
  }
  
  tournament.teams = tournament.teams || [];
  tournament.teamLogos = tournament.teamLogos || {};
  tournament.matches = tournament.matches || [];
  tournament.groupMatches = tournament.groupMatches || [];
  tournament.knockoutMatches = tournament.knockoutMatches || [];
  
  tournament.teams[editingIndex] = newName;
  
  const updateMatches = (arr) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((match) => {
      if (!match) return;
      
      if (match.home && typeof match.home === 'object' && match.home.name === oldName) {
        match.home.name = newName;
      }
      if (match.away && typeof match.away === 'object' && match.away.name === oldName) {
        match.away.name = newName;
      }
      
      if (match.home === oldName) match.home = newName;
      if (match.away === oldName) match.away = newName;
    });
  };
  
  updateMatches(tournament.matches);
  updateMatches(tournament.groupMatches);
  updateMatches(tournament.knockoutMatches);
  
  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      if (e.target?.result) {
        const logoKey = `logo_${tournament.id}_${newName.replace(/\s+/g, '_')}`;
        try {
          await saveLogoToIndexedDB(logoKey, e.target.result);
          tournament.teamLogos[newName] = logoKey;
          if (newName !== oldName && tournament.teamLogos[oldName]) {
            delete tournament.teamLogos[oldName];
          }
        } catch (dbErr) {
          tournament.teamLogos[newName] = e.target.result;
        }
      }
      await handleSave(tournament, newName, oldName);
    };
    
    reader.onerror = () => {
      showAlert("Failed to read image <br> Ensure you select a jpeg or png file");
    };
    
    reader.readAsDataURL(file);
  } else {
    await handleSave(tournament, newName, oldName);
  }
}







async function handleSave(tournament, newName, oldName) {
  if (newName !== oldName && tournament.teamLogos && tournament.teamLogos[oldName]) {
    const oldLogoKey = tournament.teamLogos[oldName];
    const newLogoKey = `logo_${tournament.id}_${newName.replace(/\s+/g, '_')}`;
    
    if (oldLogoKey && !oldLogoKey.startsWith("data:image")) {
      try {
        const base64Data = await getLogoFromIndexedDB(oldLogoKey);
        if (base64Data) {
          await saveLogoToIndexedDB(newLogoKey, base64Data);
          
          const db = await openLogoDB();
          const tx = db.transaction("logos", "readwrite");
          tx.objectStore("logos").delete(oldLogoKey);
        }
        tournament.teamLogos[newName] = newLogoKey;
      } catch (err) {
        tournament.teamLogos[newName] = oldLogoKey;
      }
    } else {
      tournament.teamLogos[newName] = oldLogoKey;
    }
    
    delete tournament.teamLogos[oldName];
  }
  
  try {
    updateTournament(tournament);
  } catch (e) {
    showActionModal("Failed to save changes. Please try again", "delete");
    return;
  }
  
  try {
    if (document.getElementById("teamList")) renderTeams("teamList");
    if (document.getElementById("cupTeamsContainer")) renderTeams("cupTeamsContainer");
    
    rebuildTableFromMatches();
    if (typeof renderFixtures === "function") renderFixtures();
    if (typeof renderFullBracket === "function") renderFullBracket();
  } catch (e) {
    console.error(e);
    showActionModal("Team saved but something went wrong", "delete");
    return;
  }
  
  closeEditModal();
  showActionModal("Team updated successfully", "success");
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
        showActionModal('Image downloaded! Share it manually.', 'success');
      }
    });
    
  } catch (err) {
    console.error('Share failed:', err);
    showActionModal('Could not capture table', 'delete');
  } finally {
    if (!wasInScreenshotMode) {
      wrapper.classList.remove('screenshot-mode');
    }
  }
}


async function shareCupTable() {
  const wrapper = document.getElementById('cupTables');
  
  if (!wrapper) {
    showActionModal('Screenshot target area not found!', 'delete');
    return;
  }
  
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
      if (!blob) {
        showActionModal('Failed to process screenshot image.', 'delete');
        return;
      }
      
      const file = new File([blob], 'match-records.png', {
        type: 'image/png'
      });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'eFootball Match Records',
          text: 'Group Stage Matches',
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'match-records.png';
        a.click();
        URL.revokeObjectURL(url);
        
        showActionModal('Image downloaded! Share it manually.', 'success');
      }
    });
    
  } catch (err) {
    console.error('Share failed:', err);
    showActionModal('Could not capture records', 'delete');
  } finally {
    if (!wasInScreenshotMode) {
      wrapper.classList.remove('screenshot-mode');
    }
  }
}


async function shareCupFixture() {
  const wrapper = document.getElementById('cupFixtures');
  
  if (!wrapper) {
    showActionModal('Screenshot target area not found!', 'delete');
    return;
  }
  
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
      if (!blob) {
        showActionModal('Failed to process screenshot image.', 'delete');
        return;
      }
      
      const file = new File([blob], 'match-records.png', {
        type: 'image/png'
      });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'eFootball Match Records',
          text: 'Group Stage Matches',
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'match-records.png';
        a.click();
        URL.revokeObjectURL(url);
        
        showActionModal('Image downloaded! Share it manually.', 'success');
      }
    });
    
  } catch (err) {
    console.error('Share failed:', err);
    showActionModal('Could not capture records', 'delete');
  } finally {
    if (!wasInScreenshotMode) {
      wrapper.classList.remove('screenshot-mode');
    }
  }
}