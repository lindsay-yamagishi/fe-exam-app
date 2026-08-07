// Firebase SDK (v10) のインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ★ Firebase Consoleの「プロジェクト設定」にあるAPIキー情報を貼り付けてください
const firebaseConfig = {
  apiKey: "AIzaSyB42KCNzkX7A4_6Nv5WqhrvVXE6f8dSiAw",
  authDomain: "fe-exam-app-9cd55.firebaseapp.com",
  projectId: "fe-exam-app-9cd55",
  storageBucket: "fe-exam-app-9cd55.firebasestorage.app",
  messagingSenderId: "440255734838",
  appId: "1:440255734838:web:d53bd24e60db7b90282497",
};


// 初期化
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);