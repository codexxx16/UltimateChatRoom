/***************************************************
 * Firebase + Gemini AI Chat App
 ***************************************************/

// ✅ Your Firebase config (replace with your keys)
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

// ✅ Gemini API Key
const GEMINI_API_KEY = "AIzaSyDA-Lr-dAtcQJR4e5ZLjtudeLpSajDj578;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Elements
const chatMessages = document.querySelector(".chat-messages");
const chatInput = document.querySelector("#chatInput");
const sendBtn = document.querySelector("#sendBtn");
const loginBtn = document.querySelector("#loginBtn");
const logoutBtn = document.querySelector("#logoutBtn");

// Auto login (anonymous)
auth.onAuthStateChanged(user => {
  if (user) {
    console.log("Logged in:", user.uid);
    setUserPresence(user.uid);
    loadMessages();
  } else {
    auth.signInAnonymously().catch(err => console.error(err));
  }
});

// Track online presence
function setUserPresence(uid) {
  const userStatusRef = db.ref("/status/" + uid);
  const isOnlineRef = db.ref(".info/connected");
  
  isOnlineRef.on("value", snapshot => {
    if (snapshot.val() === false) return;
    userStatusRef.onDisconnect().set({ online: false, lastSeen: Date.now() });
    userStatusRef.set({ online: true, lastSeen: Date.now() });
  });
}

// Send message
sendBtn.addEventListener("click", () => {
  const msg = chatInput.value.trim();
  if (!msg) return;

  const user = auth.currentUser;
  const messageObj = {
    uid: user.uid,
    text: msg,
    timestamp: Date.now(),
    from: "user"
  };

  db.ref("messages").push(messageObj);
  chatInput.value = "";

  // Send to Gemini AI
  getGeminiReply(msg);
});

// Load messages in real time
function loadMessages() {
  db.ref("messages").on("child_added", snapshot => {
    const msg = snapshot.val();
    displayMessage(msg);
  });
}

// Display message
function displayMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(msg.from === "user" ? "user" : "bot");
  div.textContent = msg.text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Gemini AI reply
async function getGeminiReply(userMsg) {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userMsg }] }]
        })
      }
    );

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No reply";

    const aiMsg = {
      uid: "gemini",
      text: aiText,
      timestamp: Date.now(),
      from: "bot"
    };

    db.ref("messages").push(aiMsg);
  } catch (err) {
    console.error("Gemini API Error:", err);
  }
}
