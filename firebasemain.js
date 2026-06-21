import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDqxVfSGWGX3zLK6xm0E8ZWY4qixY7YWX8",
  authDomain: "champions-58b37.firebaseapp.com",
  projectId: "champions-58b37",
  storageBucket: "champions-58b37.firebasestorage.app",
  messagingSenderId: "314342004686",
  appId: "1:314342004686:web:511763e991d9cf5185fd9f",
  measurementId: "G-E36L8F8B8W"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let syncTimeout;
let currentTournament = null;
let runtimeTournamentsList = [];

window.db = db;
window.auth = auth;
window.currentUser = null; 

// DOM Element Selectors
const authModal = document.getElementById("authModal");
const googleSignInBtn = document.getElementById("googleSignInBtn"); // Added for your layout target
const emailInput = document.getElementById("authEmail");
const passwordInput = document.getElementById("authPassword");
const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const userInfo = document.getElementById("userInfo");
const userEmail = document.getElementById("userEmail");
const signOutBtn = document.getElementById("signOutBtn");
const importFileInput = document.getElementById("importFileInput");

if (signUpBtn) {
  signUpBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) return alert("Please fill out all fields.");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Manager account created successfully!");
    } catch (error) {
      alert("Registration Error: " + error.message);
    }
  });
}

if (signInBtn) {
  signInBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) return alert("Please fill out all fields.");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Login Error: " + error.message);
    }
  });
}

if (signOutBtn) {
  signOutBtn.addEventListener("click", async () => {
    try {
      // Clear tracking variables safely
      runtimeTournamentsList = [];
      currentTournament = null;
      window.currentUser = null;
      localStorage.removeItem("currentTournamentId"); // Clean pointer state only

      if (typeof renderTournamentList === "function") {
        renderTournamentList();
      }
      
      await signOut(auth);
      console.log("[AUTH] Manager session terminated safely.");
    } catch (error) {
      console.error("Sign-Out Failed:", error);
    }
  });
}


onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (authModal) authModal.style.display = "none";
    if (googleSignInBtn) googleSignInBtn.style.display = "none";
    if (userInfo) userInfo.style.display = "block";
    if (userEmail) userEmail.innerText = user.email;
    window.currentUser = user; 
    
    if (window.loadFromFirebase) {
      await window.loadFromFirebase(db); 
    }
  } else {
    // Structural layout resets on sign-out state
    runtimeTournamentsList = [];
    currentTournament = null;
    window.currentUser = null;
    localStorage.removeItem("currentTournamentId");
    
    if (authModal) authModal.style.display = "flex";
    if (googleSignInBtn) googleSignInBtn.style.display = "flex";
    if (userInfo) userInfo.style.display = "none";
    if (userEmail) userEmail.innerText = "";
    
    if (typeof renderTournamentList === "function") {
      renderTournamentList();
    }
  }
});

function getTournaments() {
  return runtimeTournamentsList;
}

function saveTournaments(tournaments) {
  try {
    runtimeTournamentsList = JSON.parse(JSON.stringify(tournaments));
    if (runtimeTournamentsList.length > 0) {
      const targetTournament = runtimeTournamentsList[runtimeTournamentsList.length - 1];
      if (targetTournament) {
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
          syncSingleTournamentToFirebase(targetTournament);
        }, 300);
      }
    }
  } catch (e) {
    console.error("[STORAGE] Memory tracking allocation failed:", e);
  }
}

function setCurrentTournamentId(id) {
  if (id === null || id === undefined) {
    localStorage.removeItem("currentTournamentId");
    currentTournament = null;
  } else {
    localStorage.setItem("currentTournamentId", String(id));
    currentTournament = runtimeTournamentsList.find(t => String(t.id) === String(id)) || null;
  }
}

function getCurrentTournament() {
  if (!currentTournament) {
    const activeId = localStorage.getItem("currentTournamentId");
    if (activeId) {
      currentTournament = runtimeTournamentsList.find(t => String(t.id) === String(activeId)) || null;
    }
  }
  return currentTournament;
}

function updateTournament(tournament) {
  // Deep clone the object to break any shared memory references
  const clonedTournament = JSON.parse(JSON.stringify(tournament));
  
  currentTournament = clonedTournament;
  
  const index = runtimeTournamentsList.findIndex(t => String(t.id) === String(clonedTournament.id));
  if (index !== -1) {
    runtimeTournamentsList[index] = clonedTournament;
  } else {
    runtimeTournamentsList.push(clonedTournament);
  }
  
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncSingleTournamentToFirebase(clonedTournament);
  }, 300);
}


async function syncSingleTournamentToFirebase(tournament) {
  const activeDb = window.db || db;
  const activeUser = window.currentUser || auth.currentUser;
  if (!activeUser || !activeDb) return;
  try {
    const tournamentDocRef = doc(activeDb, "users", activeUser.uid, "tournaments", String(tournament.id));
    await setDoc(tournamentDocRef, tournament, { merge: true });
    console.log(`[CLOUD] Written directly to Firestore path document ID: ${tournament.id}`);
  } catch (err) {
    console.error("[CLOUD] Firestore write error sequence:", err.code, err.message);
  }
}

async function loadFromFirebase(dbInstance) {
  const activeDb = dbInstance || window.db || db;
  const activeUser = window.currentUser || auth.currentUser;
  if (!activeUser || !activeDb) return null;
  try {
    console.log(`[CLOUD] Source of Truth Query connecting to subcollection folder pool...`);
    const tournamentsCollRef = collection(activeDb, "users", activeUser.uid, "tournaments");
    const querySnapshot = await getDocs(tournamentsCollRef);
    
    runtimeTournamentsList = [];
    currentTournament = null;
    
    querySnapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        runtimeTournamentsList.push(docSnap.data());
      }
    });
    
    if (runtimeTournamentsList.length > 0) {
      runtimeTournamentsList.sort((a, b) => b.createdAt - a.createdAt);
      const activeId = localStorage.getItem("currentTournamentId");
      if (activeId) {
        currentTournament = runtimeTournamentsList.find(t => String(t.id) === String(activeId)) || null;
      }
      if (typeof renderTournamentList === "function") renderTournamentList();
      if (typeof init === "function") init();
      return runtimeTournamentsList;
    }
    
    if (typeof renderTournamentList === "function") renderTournamentList();
    return [];
  } catch (err) {
    console.error("[CLOUD] Failed to fetch source data pool stream:", err);
    return [];
  }
}

function exportTournament(id) {
  console.log("[EXPORT] Starting export for id:", id);
  try {
    const tournaments = getTournaments();
    const tournament = tournaments.find(t => String(t.id) === String(id));
    
    if (!tournament) {
      alert("Tournament not found");
      return;
    }
    
    const jsonString = JSON.stringify(tournament);
    const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
    
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
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        title: tournament.name,
        text: "Tournament export data",
        files: [file]
      }).catch(err => console.log("[EXPORT] Share dismissed:", err));
    } else {
      fallbackDownload(file);
    }
  } catch (err) {
    console.error("[EXPORT] Failed:", err);
    alert("Export failed: " + err.message);
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


// ===== IMPORT METHOD FUNCTION (FIXED REFERENCING BUG) =====
function importTournaments(file) {
  if (!file) return alert("No file selected");
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const rawText = e.target.result;
      let rawData = JSON.parse(rawText);
      let parsedTournament;
      
      if (rawData?.type === "TOURNAMENT_EXPORT" && rawData?.payload) {
        let decodedString = decodeURIComponent(escape(atob(rawData.payload)));
        parsedTournament = JSON.parse(decodedString);
      } else if (rawData?.id && rawData?.name) {
        parsedTournament = rawData;
      } else if (Array.isArray(rawData)) {
        parsedTournament = rawData;
      } else {
        throw new Error("Unknown file format package layout.");
      }
      
      const data = Array.isArray(parsedTournament) ? parsedTournament : [parsedTournament];
      const invalid = data.find(t => !t.id || !t.name || !t.teams);
      if (invalid) throw new Error("Missing structural data properties.");
      
      console.log(`[IMPORT] Isolatng and writing ${data.length} unique tournaments...`);
      
      // Isolate each item individually to prevent cross-contamination
      for (const tournament of data) {
        const uniqueClone = JSON.parse(JSON.stringify(tournament));
        updateTournament(uniqueClone); 
      }
      
      alert(`📥 Imported ${data.length} tournament(s) successfully! Each tournament is now completely independent.`);
      if (importFileInput) importFileInput.value = "";
      if (typeof renderTournamentList === "function") renderTournamentList();
      
    } catch (err) {
      console.error("[IMPORT] Failed:", err);
      alert("Import failed: " + err.message);
    }
  };
  reader.readAsText(file);
}


window.getTournaments = getTournaments;
window.saveTournaments = saveTournaments;
window.setCurrentTournamentId = setCurrentTournamentId;
window.getCurrentTournament = getCurrentTournament;
window.updateTournament = updateTournament;
window.syncSingleTournamentToFirebase = syncSingleTournamentToFirebase;
window.syncAllTournamentsToFirebase = syncSingleTournamentToFirebase;
window.loadFromFirebase = loadFromFirebase;
window.exportTournament = exportTournament;
window.importTournaments = importTournaments;
