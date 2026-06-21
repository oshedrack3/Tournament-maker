import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
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

window.db = db;
window.auth = auth;
window.currentUser = null;

const authModal = document.getElementById("authModal");
const emailInput = document.getElementById("authEmail");
const passwordInput = document.getElementById("authPassword");
const signInBtn = document.getElementById("signInBtn");
const userInfo = document.getElementById("userInfo");
const userEmail = document.getElementById("userEmail");

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

function exportTournamentsToFile(rawData) {
  try {
    const blob = new Blob([rawData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tournaments_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("[EXPORT] Backup file download triggered successfully.");
  } catch (err) {
    console.error("[EXPORT] Failed to download backup file:", err);
  }
}

async function runOneTimeMigration(user) {
  try {
    const rawLocalData = localStorage.getItem("tournaments");
    if (!rawLocalData) {
      console.log("[MIGRATION] No local tournament records found.");
      alert("No local data found to migrate.");
      return;
    }

    console.log("[MIGRATION] Exporting physical backup file...");
    exportTournamentsToFile(rawLocalData);

    const localTournaments = JSON.parse(rawLocalData);
    if (!Array.isArray(localTournaments) || localTournaments.length === 0) {
      alert("Local storage file downloaded, but list array is empty.");
      return;
    }

    console.log(`[MIGRATION] Forcing push for ${localTournaments.length} tournament files directly to Cloud...`);
    let uploadedCount = 0;

    for (const tournament of localTournaments) {
      if (!tournament.id) continue;
      
      const tournamentDocRef = doc(db, "users", user.uid, "tournaments", String(tournament.id));
      
      await setDoc(tournamentDocRef, tournament);
      console.log(`[MIGRATION] Force-written tournament ID: ${tournament.id}`);
      uploadedCount++;
    }

    alert(`🎉 Migration complete!\n\n1. 📥 FILE BACKUP: A physical copy has been saved to your downloads folder.\n2. ☁️ CLOUD SYNC: ${uploadedCount} tournaments have been pushed to Firestore.\n\nYou can now deploy your final system update layout!`);

  } catch (err) {
    console.error("[MIGRATION] Critical operation error:", err);
    alert("Migration operation crashed: " + err.message);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (authModal) authModal.style.display = "none";
    if (userInfo) userInfo.style.display = "block";
    if (userEmail) userEmail.innerText = user.email;
    window.currentUser = user; 
    
    console.log("Logged in as:", user.email);
    await runOneTimeMigration(user);
  } else {
    if (authModal) authModal.style.display = "flex";
    if (userInfo) userInfo.style.display = "none";
    window.currentUser = null;
  }
});
