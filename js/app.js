import { auth, provider, db } from './firebase-config.js';
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// ★ 指定されたGASのウェブアプリURL
// ==========================================
const GAS_URL = "https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnRSn5tY5ZrQEcXGQAkyLms2j3rxnUfqMwnjw7SAPii4KKjf_UGxSn-n4ueE5xPrHwifgiMtcXmnSWns_QT1D8XkHApC5CGntMLbYIC4AKOAoM5S8OtudLPVUnjfMBJEMsYAKbspXS4UmFTMFeuyVg1HHD12KmJk9dpIGO4sZC6rrunB2ZQO52MKK9X6YOkUhxdz46LIWYBFVNFkfS1j2O-ZL33uhsPPnWXSu02-spBlBJjs2ttt8T-fi1K-JCf0h1sRo1EJ6Mkcoip8i8nLVEhh9QFipg&lib=M241oWZKFqjpRT2_XOeorSS5E6Kr-M0Qx"; 

// --- DOM要素 ---
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const userName = document.getElementById('user-name');
const uiScaleSlider = document.getElementById('uiScaleSlider');
const appWidthSelect = document.getElementById('appWidthSelect');
const loadingScreen = document.getElementById('loading-screen');
const setupScreen = document.getElementById('setup-screen');
const practiceScreen = document.getElementById('practice-screen');
const questionContainer = document.getElementById('question-container');
const startPracticeBtn = document.getElementById('start-practice-btn');
const backToSetupBtn = document.getElementById('back-to-setup-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

// --- アプリステート ---
let allQuestions = [];
let practiceQuestions = [];
let currentIndex = 0;
let displayMode = 'single';
let answeredState = {};

// ★ ユーザー固有のデータ（Firestoreと同期）
let currentUserUid = null;
let userBookmarks = []; // ★マーク
let userChecked = [];   // ✔マーク (除外用)

// ==========================================
// 0. UI カスタマイズ
// ==========================================
function changeUIScale(scale) {
  document.documentElement.style.setProperty('--ui-scale', scale);
  localStorage.setItem('appUiScale_FE', scale);
}
function changeAppWidth(width) {
  document.documentElement.style.setProperty('--app-max-width', width);
  localStorage.setItem('appMaxWidth_FE', width);
}

window.addEventListener('DOMContentLoaded', () => {
  const savedScale = localStorage.getItem('appUiScale_FE');
  if (savedScale) { uiScaleSlider.value = savedScale; changeUIScale(savedScale); }
  const savedWidth = localStorage.getItem('appMaxWidth_FE');
  if (savedWidth) { appWidthSelect.value = savedWidth; changeAppWidth(savedWidth); }
  fetchQuestions();
});

uiScaleSlider.addEventListener('input', (e) => changeUIScale(e.target.value));
appWidthSelect.addEventListener('change', (e) => changeAppWidth(e.target.value));

// ==========================================
// 1. Firebase 認証 & データ同期
// ==========================================
loginBtn.addEventListener('click', async () => {
  try { await signInWithPopup(auth, provider); } catch (error) { alert("ログイン失敗"); }
});
logoutBtn.addEventListener('click', async () => {
  try { await signOut(auth); } catch (error) { console.error(error); }
});

onAuthStateChanged(auth, async (user) => {
  const bmCheck = document.getElementById('bookmarkOnlyCheck');
  const bmLabel = document.getElementById('bookmarkOnlyLabel');
  const exCheck = document.getElementById('excludeCheckedCheck');
  const exLabel = document.getElementById('excludeCheckedLabel');
  const alerts = document.querySelectorAll('.login-alert');

  if (user) {
    currentUserUid = user.uid;
    loginBtn.classList.add('hidden'); userInfo.classList.remove('hidden');
    userName.textContent = `${user.displayName} さん`;

    // Firestoreからデータを取得
    const docRef = doc(db, "users", currentUserUid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      userBookmarks = docSnap.data().bookmarks || [];
      userChecked = docSnap.data().checked || [];
    } else {
      userBookmarks = [];
      userChecked = [];
    }

    // ユーザー専用フィルターUIを有効化
    bmCheck.disabled = false; exCheck.disabled = false;
    bmLabel.style.color = "#333"; exLabel.style.color = "#333";
    alerts.forEach(el => el.style.display = "none");
  } else {
    currentUserUid = null; userBookmarks = []; userChecked = [];
    loginBtn.classList.remove('hidden'); userInfo.classList.add('hidden');
    userName.textContent = '';

    // ユーザー専用フィルターUIを無効化
    bmCheck.disabled = true; bmCheck.checked = false;
    exCheck.disabled = true; exCheck.checked = true; // デフォルト設定はONだが操作不可に
    bmLabel.style.color = "#999"; exLabel.style.color = "#999";
    alerts.forEach(el => el.style.display = "inline");
  }
});

// ==========================================
// 2. データ取得
// ==========================================
async function fetchQuestions() {
  try {
    const response = await fetch(GAS_URL);
    if (!response.ok) throw new Error("Network response was not ok");
    allQuestions = await response.json();
    
    const sessions = [...new Set(allQuestions.map(q => {
      const d = new Date(q.date);
      return isNaN(d) ? "不明" : `${d.getFullYear()}年${d.getMonth() + 1}月`;
    }))];
    
    const container = document.getElementById('session-checkboxes');
    container.innerHTML = sessions.map(s => `
      <label><input type="checkbox" class="session-check" value="${s}" checked style="transform: scale(1.2); margin-right:5px;"> ${s}</label>
    `).join('');

    document.getElementById('selectAllSessions').addEventListener('change', (e) => {
      document.querySelectorAll('.session-check').forEach(cb => cb.checked = e.target.checked);
    });

    loadingScreen.classList.add('hidden');
    setupScreen.classList.remove('hidden');
    document.getElementById('total-questions-info').textContent = `総問題数: ${allQuestions.length} 問`;
  } catch (error) {
    loadingScreen.innerHTML = `<h3 style="color:red;">データ読み込み失敗</h3><p>${error.message}</p>`;
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ==========================================
// 3. 演習の開始・各種フィルターロジック
// ==========================================
startPracticeBtn.addEventListener('click', () => {
  const errorEl = document.getElementById('setup-error');
  errorEl.classList.add('hidden');

  displayMode = document.querySelector('input[name="displayMode"]:checked').value;
  let filtered = [...allQuestions];

  // ① 試験回フィルター
  const checkedSessions = Array.from(document.querySelectorAll('.session-check:checked')).map(cb => cb.value);
  filtered = filtered.filter(q => {
    const d = new Date(q.date);
    const sName = isNaN(d) ? "不明" : `${d.getFullYear()}年${d.getMonth() + 1}月`;
    return checkedSessions.includes(sName);
  });

  // ② キーワードフィルター
  const keyword = document.getElementById('keywordInput').value.trim().toLowerCase();
  if (keyword) {
    filtered = filtered.filter(q => 
      (q.question && q.question.toLowerCase().includes(keyword)) ||
      q.options.some(opt => opt.text && opt.text.toLowerCase().includes(keyword))
    );
  }

  // ③ カテゴリフィルター
  const checkedCategories = Array.from(document.querySelectorAll('.cat-check:checked')).map(cb => cb.value);
  if (checkedCategories.length > 0) {
    filtered = filtered.filter(q => 
      checkedCategories.includes(q.middleCategory) || checkedCategories.includes(q.majorCategory)
    );
  } else {
    // 1つも選択されていない場合は出題なしとする
    filtered = []; 
  }

  // ④ 教科書ページフィルター
  const pMainMin = parseInt(document.getElementById('pageMainMin').value);
  const pMainMax = parseInt(document.getElementById('pageMainMax').value);
  const pSubMin = parseInt(document.getElementById('pageSubMin').value);
  const pSubMax = parseInt(document.getElementById('pageSubMax').value);

  if (!isNaN(pMainMin) || !isNaN(pMainMax)) {
    filtered = filtered.filter(q => {
      const p = parseInt(q.pageMain);
      if (isNaN(p)) return false;
      if (!isNaN(pMainMin) && p < pMainMin) return false;
      if (!isNaN(pMainMax) && p > pMainMax) return false;
      return true;
    });
  }
  if (!isNaN(pSubMin) || !isNaN(pSubMax)) {
    filtered = filtered.filter(q => {
      const p = parseInt(q.pageSub);
      if (isNaN(p)) return false;
      if (!isNaN(pSubMin) && p < pSubMin) return false;
      if (!isNaN(pSubMax) && p > pSubMax) return false;
      return true;
    });
  }

  // ⑤ ブックマーク(★)のみ
  if (document.getElementById('bookmarkOnlyCheck').checked && currentUserUid) {
    filtered = filtered.filter(q => userBookmarks.includes(q.id));
  }

  // ⑥ チェック(✔)済みを除外
  if (document.getElementById('excludeCheckedCheck').checked && currentUserUid) {
    filtered = filtered.filter(q => !userChecked.includes(q.id));
  }

  // --- フィルタリング完了 ---
  practiceQuestions = filtered;

  if (practiceQuestions.length === 0) {
    errorEl.textContent = "指定された条件に一致する問題がありません。";
    errorEl.classList.remove('hidden');
    return;
  }

  if (document.getElementById('randomOrderCheck').checked) shuffleArray(practiceQuestions);
  if (document.getElementById('shuffleOptionsCheck').checked) practiceQuestions.forEach(q => shuffleArray(q.options));

  setupScreen.classList.add('hidden');
  practiceScreen.classList.remove('hidden');
  currentIndex = 0; answeredState = {};
  renderQuestions();
});

backToSetupBtn.addEventListener('click', () => {
  practiceScreen.classList.add('hidden');
  setupScreen.classList.remove('hidden');
});

prevBtn.addEventListener('click', () => {
  const step = (displayMode === 'chunk10') ? 10 : 1;
  if (currentIndex - step >= 0) { currentIndex -= step; renderQuestions(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});

nextBtn.addEventListener('click', () => {
  const step = (displayMode === 'chunk10') ? 10 : 1;
  if (currentIndex + step < practiceQuestions.length) { currentIndex += step; renderQuestions(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});

// ==========================================
// 4. 問題の描画
// ==========================================
function renderQuestions() {
  let step = 1; let endIndex = practiceQuestions.length;
  if (displayMode === 'single') { step = 1; endIndex = currentIndex + step; }
  else if (displayMode === 'chunk10') { step = 10; endIndex = Math.min(currentIndex + step, practiceQuestions.length); }
  else { currentIndex = 0; }

  const questionsToRender = practiceQuestions.slice(currentIndex, endIndex);

  if (displayMode === 'all') { prevBtn.classList.add('hidden'); nextBtn.classList.add('hidden'); }
  else {
    prevBtn.classList.toggle('hidden', currentIndex === 0);
    nextBtn.classList.toggle('hidden', endIndex >= practiceQuestions.length);
  }

  const isReviewMode = document.getElementById('reviewModeCheck').checked;
  let html = '';

  questionsToRender.forEach((q, idx) => {
    const actualIndex = currentIndex + idx;
    const dateObj = new Date(q.date);
    const dateStr = isNaN(dateObj) ? "日付不明" : `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月実施`;

    // ★ ブックマークとチェック状態
    const isBookmarked = userBookmarks.includes(q.id);
    const starColor = isBookmarked ? "#f39c12" : "#cccccc";
    const isChecked = userChecked.includes(q.id);
    const checkColor = isChecked ? "#27ae60" : "#cccccc";

    const optionsHtml = q.options.map(opt => {
      let btnClass = "choice";
      if (isReviewMode) {
        btnClass += " disabled";
        if (opt.id === q.correctAnswer) btnClass += " correct";
      } else if (answeredState[q.id]) {
        btnClass += " disabled";
      }
      return `
        <button class="${btnClass}" data-question-id="${q.id}" data-id="${opt.id}">
          <strong>${opt.id}:</strong> ${opt.text || ''}
          ${opt.imageUrl ? `<img src="${opt.imageUrl}" class="choice-img">` : ''}
        </button>
      `;
    }).join('');

    html += `
      <div class="card" id="card-${q.id}">
        <div class="meta-area">
          <span style="color:#666; font-size:0.9rem;">${dateStr} - 問題 ${q.number} (${actualIndex + 1} / ${practiceQuestions.length}問)</span>
          <div style="display:flex; gap:15px; align-items:center;">
            <span style="color:#666; font-size:0.9rem;">ID: ${q.id}</span>
            <span class="bookmark-toggle" data-id="${q.id}" title="ブックマーク" style="cursor:pointer; font-size:1.4rem; color:${starColor}; user-select:none;">★</span>
            <span class="check-toggle" data-id="${q.id}" title="除外チェック" style="cursor:pointer; font-size:1.4rem; color:${checkColor}; user-select:none;">✔</span>
          </div>
        </div>
        <p style="font-size:1.15rem; font-weight:bold; white-space: pre-wrap; line-height: 1.6;">${q.question}</p>
        ${q.tableHtml ? `<div class="question-table">${q.tableHtml}</div>` : ''}
        ${q.imageUrl ? `<img src="${q.imageUrl}" class="question-img">` : ''}
        <div style="margin-top:1.5rem;">${optionsHtml}</div>
        
        <div class="feedback-area hidden" style="text-align: center; margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px; border: 1px solid #ddd;">
          <h3 class="feedback-text" style="margin: 0;"></h3>
        </div>
      </div>
    `;
  });

  questionContainer.innerHTML = html;
}

// ==========================================
// 5. イベントデリゲーション (正誤判定 / ★ / ✔)
// ==========================================
questionContainer.addEventListener('click', async (e) => {
  // --- ★ ブックマーク ---
  if (e.target.classList.contains('bookmark-toggle')) {
    if (!currentUserUid) { alert("ログインが必要です。"); return; }
    const qId = e.target.getAttribute('data-id');
    const index = userBookmarks.indexOf(qId);
    if (index > -1) { userBookmarks.splice(index, 1); e.target.style.color = '#cccccc'; } 
    else { userBookmarks.push(qId); e.target.style.color = '#f39c12'; }
    try { await setDoc(doc(db, "users", currentUserUid), { bookmarks: userBookmarks }, { merge: true }); } catch(e){}
    return;
  }

  // --- ✔ チェック(除外用) ---
  if (e.target.classList.contains('check-toggle')) {
    if (!currentUserUid) { alert("ログインが必要です。"); return; }
    const qId = e.target.getAttribute('data-id');
    const index = userChecked.indexOf(qId);
    if (index > -1) { userChecked.splice(index, 1); e.target.style.color = '#cccccc'; } 
    else { userChecked.push(qId); e.target.style.color = '#27ae60'; }
    try { await setDoc(doc(db, "users", currentUserUid), { checked: userChecked }, { merge: true }); } catch(e){}
    return;
  }

  // --- 正誤判定 ---
  const clickedBtn = e.target.closest('.choice');
  if (!clickedBtn) return;
  const questionId = clickedBtn.getAttribute('data-question-id');
  const selectedId = clickedBtn.getAttribute('data-id');

  if (answeredState[questionId]) return;
  answeredState[questionId] = true;

  const q = practiceQuestions.find(item => String(item.id) === String(questionId));
  if (!q) return;
  
  const qCard = document.getElementById(`card-${questionId}`);
  qCard.querySelectorAll('.choice').forEach(btn => {
    btn.classList.add('disabled');
    const btnId = btn.getAttribute('data-id');
    if (btnId === q.correctAnswer) btn.classList.add('correct');
    else if (btnId === selectedId) btn.classList.add('wrong');
  });

  const feedbackArea = qCard.querySelector('.feedback-area');
  const feedbackText = qCard.querySelector('.feedback-text');
  feedbackArea.classList.remove('hidden');
  
  if (selectedId === q.correctAnswer) {
    feedbackText.textContent = "⭕️ 正解です！"; feedbackText.style.color = "#28a745";
  } else {
    feedbackText.textContent = `❌ 不正解... (正解は ${q.correctAnswer})`; feedbackText.style.color = "#dc3545";
  }
});