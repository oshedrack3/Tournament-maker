/*


// ===== EXPORT =====
function exportTournament(id) {
  console.log("[EXPORT] Starting export for id:", id);
  
  try {
    const tournaments = getTournaments();
    const tournament = tournaments.find(t => t.id === id);
    
    if (!tournament) {
      showAlert("Tournament not found");
      return;
    }
    
    // 1. Stringify and base64 encode. No pretty-print to avoid newlines
    const jsonString = JSON.stringify(tournament);
    const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
    
    console.log("[EXPORT] Tournament stringified. Length:", jsonString.length);
    console.log("[EXPORT] Base64 length:", base64Data.length);
    
    // 2. Wrap in package
    const exportPackage = {
      type: "TOURNAMENT_EXPORT",
      version: "1.0",
      payload: base64Data,
      meta: {
        name: tournament.name,
        exportedAt: new Date().toISOString()
      }
    };
    
    const blob = new Blob([JSON.stringify(exportPackage)], { type: "application/json" });
    const fileName = `${tournament.name.replace(/[^\w]/g, '_')}.json`;
    const file = new File([blob], fileName, { type: "application/json" });
    
    console.log("[EXPORT] File created:", fileName, "Size:", file.size, "bytes");
    
    // 3. Share or download
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        title: tournament.name,
        text: "Tournament export data",
        files: [file]
      }).then(() => {
        console.log("[EXPORT] Share successful");
      }).catch(err => {
        console.log("[EXPORT] Share dismissed:", err);
      });
    } else {
      fallbackDownload(file);
      console.log("[EXPORT] Fallback download triggered");
    }
    
  } catch (err) {
    console.error("[EXPORT] Failed:", err);
    showAlert("Export failed: " + err.message);
  }
}

function fallbackDownload(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ===== IMPORT =====
function importTournaments(file) {
  console.log("[IMPORT] File selected:", file.name, "Size:", file.size, "Type:", file.type);
  
  if (!file) {
    showAlert("No file selected");
    return;
  }
  
  if (file.size === 0) {
    showAlert("File is empty");
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const rawText = e.target.result;
      console.log("[IMPORT] File read. First 200 chars:", rawText.slice(0, 200));
      
      // Step 1: Parse outer JSON
      let rawData;
      try {
        rawData = JSON.parse(rawText);
        console.log("[IMPORT] Outer JSON parsed. Type:", rawData?.type);
      } catch (e) {
        throw new Error("File is not valid JSON. Check for extra commas or missing brackets.");
      }
      
      let parsedTournament;
      
      // Step 2: Detect format
      if (rawData?.type === "TOURNAMENT_EXPORT" && rawData?.payload) {
        console.log("[IMPORT] Detected v1.0 export package");
        
        // Step 3: Decode base64 payload
        let decodedString;
        try {
          decodedString = decodeURIComponent(escape(atob(rawData.payload)));
          console.log("[IMPORT] Base64 decoded. Length:", decodedString.length);
        } catch (e) {
          throw new Error("Base64 payload is corrupted. File may be damaged.");
        }
        
        // Step 4: Parse inner tournament JSON
        try {
          parsedTournament = JSON.parse(decodedString);
        } catch (e) {
          throw new Error("Decoded payload is not valid JSON");
        }
        
      } else if (rawData?.id && rawData?.name) {
        console.log("[IMPORT] Detected legacy single tournament format");
        parsedTournament = rawData;
        
      } else if (Array.isArray(rawData)) {
        console.log("[IMPORT] Detected array format");
        parsedTournament = rawData;
        
      } else {
        throw new Error("Unknown file format. Expected TOURNAMENT_EXPORT or tournament object.");
      }
      
      // Step 5: Normalize to array
      const data = Array.isArray(parsedTournament) ? parsedTournament : [parsedTournament];
      console.log("[IMPORT] Normalized to array. Count:", data.length);
      
      // Step 6: Validate structure
      const invalid = data.find(t => !t.id || !t.name || !t.teams);
      if (invalid) {
        console.error("[IMPORT] Invalid tournament object:", invalid);
        throw new Error("One or more tournaments are missing required fields: id, name, teams");
      }
      
      // Step 7: Save
      const existing = getTournaments();
      const merged = [...existing, ...data];
      saveTournaments(merged);
      
      console.log("[IMPORT] Saved. Total tournaments:", merged.length);
      showAlert(`Imported ${data.length} tournament(s) successfully`);
      
      if (typeof renderTournamentList === "function") {
        renderTournamentList();
      }
      
    } catch (err) {
      console.error("[IMPORT] Failed:", err);
      showAlert("Import failed: " + err.message);
    }
  };
  
  reader.onerror = function(e) {
    console.error("[IMPORT] FileReader error:", e);
    showAlert("Failed to read file");
  };
  
  reader.readAsText(file);
}


f









async function signInWithGoogle() {
  const result = await auth.signInWithPopup(provider);
  await loadFromFirebase();
  return result.user;
}

function signOut() {
  localStorage.removeItem("tournament");
  currentTournament = null;
  return auth.signOut();
}

*/



function handleAddTeam() {
  console.log("[handleAddTeam] Triggered");
  
  const nameInput = document.getElementById("teamNameInput");
  const logoInput = document.getElementById("teamLogoInput");
  
  if (!nameInput || !logoInput) {
    console.error("[handleAddTeam] Missing DOM elements", { nameInput, logoInput });
    showAlert("Error: Form elements not found");
    return;
  }
  
  const name = nameInput.value.trim();
  console.log("[handleAddTeam] Team name:", name);
  
  if (!name) {
    console.warn("[handleAddTeam] Empty team name");
    showAlert("Enter a team name");
    return;
  }
  
  const file = logoInput.files[0];
  console.log("[handleAddTeam] Logo file:", file);
  
  if (!file) {
    console.warn("[handleAddTeam] No file selected");
    showAlert("Team logo is required");
    return;
  }
  
  if (!file.type.startsWith("image/")) {
    console.warn("[handleAddTeam] Invalid file type:", file.type);
    showAlert("Please select an image file");
    return;
  }
  
  console.log("[handleAddTeam] Starting background removal");
  removeBackground(file, transparentLogo => {
    console.log("[handleAddTeam] Background removed. Logo size:", transparentLogo?.length);
    
    if (!transparentLogo) {
      console.error("[handleAddTeam] removeBackground returned empty logo");
      showAlert("Failed to process logo");
      return;
    }
    
    addTeam(name, transparentLogo);
    nameInput.value = "";
    resetLogoUI();
  });
}

function addTeam(name, logo) {
  console.log("[addTeam] Called with:", { name, logoLength: logo?.length });
  
  try {
    let tournament = getCurrentTournament();
    const allTournaments = getTournaments();
    
    if (!tournament && allTournaments.length > 0) {
      console.warn("[addTeam] currentTournament was null. Falling back to active workspace context.");
      const activeId = localStorage.getItem("currentTournamentId");
      if (activeId) {
        tournament = allTournaments.find(t => String(t.id) === String(activeId));
      }
      if (!tournament) {
        tournament = allTournaments[allTournaments.length - 1];
      }
      if (tournament) {
        currentTournament = tournament;
        localStorage.setItem("tournament", JSON.stringify(tournament));
      }
    }
    
    console.log("[addTeam] Resolved tournament context:", tournament);
    
    if (!tournament) {
      console.error("[addTeam] No current tournament found");
      showAlert("No tournament selected");
      return;
    }
    
    if (!logo) {
      console.error("[addTeam] Logo is null/undefined");
      showAlert("Team logo is required");
      return;
    }
    
    if (!Array.isArray(tournament.teams)) {
      console.warn("[addTeam] tournament.teams is not an array. Initializing.");
      tournament.teams = [];
    }
    
    if (tournament.teams.includes(name)) {
      console.warn("[addTeam] Team already exists:", name);
      showAlert("Team already exists");
      return;
    }
    
    tournament.teams.push(name);
    tournament.teamLogos = tournament.teamLogos || {};
    tournament.teamLogos[name] = logo;
    console.log("[addTeam] Team added. Total teams:", tournament.teams.length);
    
    console.log("[addTeam] All tournaments count:", allTournaments.length);
    let index = allTournaments.findIndex(t => String(t.id) === String(tournament.id));
    console.log("[addTeam] Tournament index in array:", index);
    
    if (index === -1 && allTournaments.length > 0) {
      index = allTournaments.length - 1;
    }
    
    if (index !== -1) {
      allTournaments[index] = tournament;
      localStorage.setItem("tournaments", JSON.stringify(allTournaments));
      console.log("[addTeam] Saved to localStorage tournaments list");
    } else {
      allTournaments.push(tournament);
      localStorage.setItem("tournaments", JSON.stringify(allTournaments));
    }
    
    updateTournament(tournament);
    console.log("[addTeam] updateTournament called");
    
    showActionModal("✅ Team Registered", "success");
    
    if (typeof buildTable === "function") {
      console.log("[addTeam] Calling buildTable");
      buildTable();
    }
    
    const updated = getCurrentTournament() || tournament;
    console.log("[addTeam] Updated tournament reference:", updated);
    
    if (typeof renderTable === "function" && typeof getSortedTable === "function" && updated.table) {
      console.log("[addTeam] Rendering table");
      renderTable(getSortedTable(updated.table));
    }
    
    if (typeof renderTeams === "function") {
      console.log("[addTeam] Rendering teams");
      renderTeams();
    }
    
    console.log("[addTeam] Done");
    
  } catch (err) {
    console.error("[addTeam] Fatal error:", err);
    showAlert("Something went wrong. Check console for details.");
  }
}



