// Basit frontend JS (vanilla) — fetch API ile backend'e istek atar.
// Ayarlar:
const API_BASE = 'http://localhost:5000';

// Elementler
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const btnLogin = document.getElementById('btn-login');

const regUsername = document.getElementById('reg-username');
const regPassword = document.getElementById('reg-password');
const regOwnerSecret = document.getElementById('reg-owner-secret');
const btnRegister = document.getElementById('btn-register');

const authMsg = document.getElementById('auth-msg');
const userInfo = document.getElementById('user-info');
const authForms = document.getElementById('auth-forms');

const createSection = document.getElementById('create-poem');
const poemTitle = document.getElementById('poem-title');
const poemBody = document.getElementById('poem-body');
const btnCreatePoem = document.getElementById('btn-create-poem');
const createMsg = document.getElementById('create-msg');

const poemList = document.getElementById('poem-list');
const btnRefresh = document.getElementById('btn-refresh');
const searchInput = document.getElementById('search');

const TOKEN_KEY = 'ps_token';

// Yardımcılar
function setToken(t){
  if(t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
function getToken(){ return localStorage.getItem(TOKEN_KEY); }

function decodeJwt(token){
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g,'+').replace(/_/g,'/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch { return null; }
}

function showMsg(el, txt, isError=false){
  el.textContent = txt;
  el.style.color = isError ? 'var(--danger)' : '';
  setTimeout(()=>{ if(el.textContent === txt) el.textContent = ''; }, 4000);
}

// Auth işlemleri
btnRegister.addEventListener('click', async ()=>{
  const username = regUsername.value.trim();
  const password = regPassword.value;
  const ownerSecret = regOwnerSecret.value.trim();
  if(!username || !password) return showMsg(authMsg, 'Kullanıcı adı ve parola gerekli', true);
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ username, password, ownerSecret: ownerSecret || undefined })
    });
    const data = await res.json();
    if(!res.ok) return showMsg(authMsg, data.error || 'Kayıt başarısız', true);

    // bazı backend'ler register'da token döner, bazıları sadece user döner.
    if(data.access || data.token){
      const token = data.access || data.token;
      setToken(token);
      initAuthUI();
      showMsg(authMsg, 'Kayıt başarılı — giriş yapıldı');
      loadPoems();
    } else {
      showMsg(authMsg, 'Kayıt başarılı. Giriş yapınız (eğer token gelmediyse).');
      // optionally auto-login if backend returned user credentials
    }
    regUsername.value = ''; regPassword.value = ''; regOwnerSecret.value = '';
  } catch (err) {
    console.error(err);
    showMsg(authMsg, 'Kayıt sırasında hata', true);
  }
});

btnLogin.addEventListener('click', async ()=>{
  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  if(!username || !password) return showMsg(authMsg, 'Kullanıcı adı ve parola gerekli', true);
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if(!res.ok) return showMsg(authMsg, data.error || 'Giriş başarısız', true);

    const token = data.access || data.token || data; // be forgiving
    // If response is like { token: '...' } or { access: '...' } or {token:...}
    let finalToken = null;
    if(typeof token === 'string') finalToken = token;
    else if(token && token.token) finalToken = token.token;
    else if(data.access) finalToken = data.access;
    else if(data.token) finalToken = data.token;
    else if(data && data.user && data.user.access) finalToken = data.user.access;

    if(finalToken){
      setToken(finalToken);
      showMsg(authMsg, 'Giriş başarılı');
      initAuthUI();
      loadPoems();
    } else {
      showMsg(authMsg, 'Sunucudan token alınamadı — giriş kontrol ediniz', true);
    }

    loginUsername.value=''; loginPassword.value='';
  } catch(err){
    console.error(err);
    showMsg(authMsg, 'Giriş sırasında hata', true);
  }
});

// Çıkış
function logout(){
  setToken(null);
  initAuthUI();
  showMsg(authMsg, 'Çıkış yapıldı');
}

// UI durumunu başlat
function initAuthUI(){
  const token = getToken();
  if(!token){
    userInfo.classList.add('hidden');
    authForms.classList.remove('hidden');
    createSection.classList.add('hidden');
    return;
  }
  // Decode token to extract approval and username if present
  const payload = decodeJwt(token);
  const approved = payload?.approved ?? false;
  const username = payload?.username ?? payload?.name ?? `user-${payload?.id ?? ''}`;

  authForms.classList.add('hidden');
  userInfo.classList.remove('hidden');
  userInfo.innerHTML = `
    <div><strong>${username}</strong> ${approved ? '<span class="small"> (Onaylı)</span>' : '<span class="small"> (Onay bekliyor)</span>'}</div>
    <div class="row" style="margin-top:8px">
      <button id="btn-logout" style="background:#ef4444">Çıkış</button>
    </div>
  `;
  document.getElementById('btn-logout').addEventListener('click', logout);

  if(approved) createSection.classList.remove('hidden');
  else createSection.classList.add('hidden');
}

// Şiirleri çek
async function loadPoems(){
  try {
    const res = await fetch(`${API_BASE}/poems`);
    const data = await res.json();
    if(!res.ok) {
      poemList.innerHTML = `<div class="muted">Şiirler yüklenemedi: ${data.error||res.status}</div>`;
      return;
    }
    renderPoems(data);
  } catch(err){
    console.error(err);
    poemList.innerHTML = `<div class="muted">Sunucuya bağlanılamadı</div>`;
  }
}

function renderPoems(poems){
  const q = searchInput.value.trim().toLowerCase();
  const filtered = q ? poems.filter(p => (p.title + ' ' + (p.body||p.content||'')).toLowerCase().includes(q)) : poems;

  if(filtered.length === 0){
    poemList.innerHTML = '<div class="muted">Henüz şiir yok.</div>';
    return;
  }

  poemList.innerHTML = '';
  filtered.forEach(p => {
    const el = document.createElement('div');
    el.className = 'poem';
    const created = new Date(p.createdAt || p.created_at || Date.now()).toLocaleString();
    const title = escapeHtml(p.title || p.title);
    const body = escapeHtml(p.body || p.content || '');
    const author = (p.author && p.author.username) ? p.author.username : (p.authorName || 'Anon');

    el.innerHTML = `
      <div class="meta">
        <div><div class="author">${title}</div><div class="small">${created}</div></div>
        <div class="small">Yazar: <span class="author">${author}</span></div>
      </div>
      <div class="content">${body}</div>
      <div class="comment-section">
        <div class="small" style="margin-top:8px">Yorumlar (${(p.comments||[]).length})</div>
        <div class="comments"></div>
        <div class="comment-form">
          <input class="comment-input" placeholder="Yorum yaz..." />
          <button class="comment-send">Gönder</button>
        </div>
      </div>
    `;

    // render comments
    const commentsEl = el.querySelector('.comments');
    (p.comments||[]).forEach(c=>{
      const cdiv = document.createElement('div');
      cdiv.className = 'comment';
      const who = (c.author && c.author.username) ? c.author.username : (c.authorName || 'Anon');
      cdiv.innerHTML = `<div class="who">${escapeHtml(who)}</div><div class="small">${new Date(c.createdAt || c.created_at || Date.now()).toLocaleString()}</div><div class="content">${escapeHtml(c.text || c.content || c) }</div>`;
      commentsEl.appendChild(cdiv);
    });

    // comment button
    const sendBtn = el.querySelector('.comment-send');
    const inputEl = el.querySelector('.comment-input');
    sendBtn.addEventListener('click', async ()=>{
      const text = inputEl.value.trim();
      if(!text) return;
      const token = getToken();
      if(!token) { showMsg(authMsg,'Yorum için giriş yapmalısınız', true); return; }
      try {
        const res = await fetch(`${API_BASE}/poems/${p.id}/comment`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ content: text })
        });
        const data = await res.json();
        if(!res.ok) return showMsg(authMsg, data.error || 'Yorum başarısız', true);
        showMsg(authMsg, 'Yorum eklendi');
        loadPoems();
      } catch(err){
        console.error(err);
        showMsg(authMsg, 'Yorum sırasında hata', true);
      }
    });

    poemList.appendChild(el);
  });
}

// Yeni şiir
btnCreatePoem.addEventListener('click', async ()=>{
  const title = poemTitle.value.trim();
  const body = poemBody.value.trim();
  if(!title || !body) return showMsg(createMsg, 'Başlık ve gövde gerekli', true);
  const token = getToken();
  if(!token) return showMsg(createMsg, 'Giriş yapınız', true);
  try {
    const res = await fetch(`${API_BASE}/poems`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title, content: body })
    });
    const data = await res.json();
    if(!res.ok) return showMsg(createMsg, data.error || 'Şiir paylaşılırken hata', true);
    poemTitle.value=''; poemBody.value='';
    showMsg(createMsg, 'Şiir paylaşıldı');
    loadPoems();
  } catch(err){
    console.error(err);
    showMsg(createMsg, 'İstek sırasında hata', true);
  }
});

btnRefresh.addEventListener('click', loadPoems);
searchInput.addEventListener('input', ()=> loadPoems());

// Minimal HTML escape
function escapeHtml(s){
  if(!s && s !== 0) return '';
  return String(s)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'", '&#39;').replaceAll('\n','<br/>');
}

// Başlangıç
initAuthUI();
loadPoems();
