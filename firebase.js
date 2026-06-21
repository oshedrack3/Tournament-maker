import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

async function runOneTimeMigration(user) {
  try {
    const rawLocalData = localStorage.getItem("tournaments");
    if (!rawLocalData) {
      console.log("[MIGRATION] No 'tournaments' array found in localStorage to migrate.");
      alert("No local data found to migrate. Your storage might already be empty or moved!");
      return;
    }

    const localTournaments = JSON.parse(rawLocalData);
    if (!Array.isArray(localTournaments) || localTournaments.length === 0) {
      console.log("[MIGRATION] Local tournaments array is empty.");
      alert("Local tournaments list is empty. Nothing to migrate.");
      return;
    }

    console.log(`[MIGRATION] Found ${localTournaments.length} tournaments. Beginning secure migration...`);
    let uploadedCount = 0;

    for (const tournament of localTournaments) {
      if (!tournament.id) continue;
      
      const tournamentDocRef = doc(db, "users", user.uid, "tournaments", String(tournament.id));
      const docSnap = await getDoc(tournamentDocRef);
      
      if (!docSnap.exists()) {
        await setDoc(tournamentDocRef, tournament);
        console.log(`[MIGRATION] Successfully backed up tournament ID: ${tournament.id} to Firestore.`);
        uploadedCount++;
      } else {
        console.log(`[MIGRATION] Skip: Tournament ID ${tournament.id} already exists securely in Firestore.`);
      }
    }

    alert(`🎉 Success! Migration completed.\n\n${uploadedCount} tournament records have been safely uploaded from your Netlify local storage into your Firestore cloud database account.\n\nYou can now safely push the main code update.`);
    console.log("[MIGRATION] Run complete. Check your Firestore console under users/uid/tournaments/");

  } catch (err) {
    console.error("[MIGRATION] Critical block transfer error:", err);
    alert("Migration failed: " + err.message);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (authModal) authModal.style.display = "none";
    if (userInfo) userInfo.style.display = "block";
    if (userEmail) userEmail.innerText = user.email;
    window.currentUser = user; 
    
    console.log("Logged in as:", user.email);
    console.log("Starting migration sequence...");
    
    await runOneTimeMigration(user);
  } else {
    if (authModal) authModal.style.display = "flex";
    if (userInfo) userInfo.style.display = "none";
    window.currentUser = null;
  }
});
