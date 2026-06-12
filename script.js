/* ===================== FlashMemo App ===================== */
const LS = {
  cards: 'fm_cards', decks: 'fm_decks', stats: 'fm_stats',
  theme: 'fm_theme', streak: 'fm_streak'
};

let cards = load(LS.cards, []);
let decks = load(LS.decks, ['Umum']);
let stats = load(LS.stats, { quizDone: 0, correct: 0, wrong: 0, studyTime: 0 });

function load(k, def) { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } }
function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
function saveAll() { save(LS.cards, cards); save(LS.decks, decks); save(LS.stats, stats); }
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ===================== TOAST ===================== */
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ===================== THEME ===================== */
function initTheme() {
  const saved = load(LS.theme, 'light');
  document.documentElement.setAttribute('data-theme', saved);
  $('.theme-icon').textContent = saved === 'dark' ? '☀️' : '🌙';
}
$('#themeToggle').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  $('.theme-icon').textContent = next === 'dark' ? '☀️' : '🌙';
  save(LS.theme, next);
});

/* ===================== STREAK ===================== */
function updateStreak() {
  const today = new Date().toDateString();
  let s = load(LS.streak, { last: null, count: 0 });
  if (s.last !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    s.count = (s.last === yesterday) ? s.count + 1 : 1;
    s.last = today;
    save(LS.streak, s);
  }
  return s.count;
}

/* ===================== NAVBAR ===================== */
window.addEventListener('scroll', () => {
  $('#navbar').classList.toggle('scrolled', window.scrollY > 10);
});
$('#hamburger').addEventListener('click', () => $('#navLinks').classList.toggle('open'));
$$('[data-nav]').forEach(a => a.addEventListener('click', () => {
  $$('[data-nav]').forEach(x => x.classList.remove('active'));
  a.classList.add('active');
  $('#navLinks').classList.remove('open');
}));

/* ===================== RIPPLE ===================== */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-ripple');
  if (!btn) return;
  const r = document.createElement('span'); r.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  r.style.width = r.style.height = size + 'px';
  r.style.left = (e.clientX - rect.left - size / 2) + 'px';
  r.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(r);
  setTimeout(() => r.remove(), 600);
});

/* ===================== DECK SELECTS ===================== */
function refreshDeckSelects() {
  const opts = decks.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
  $('#deckInput').innerHTML = opts;
  $('#filterDeck').innerHTML = `<option value="">Semua Deck</option>` + opts;
  $('#quizDeck').innerHTML = `<option value="">Semua Deck</option>` + opts;
}

/* ===================== ESCAPE HTML ===================== */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ===================== FORM: CREATE / EDIT ===================== */
$('#flashcardForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const front = $('#frontInput').value.trim();
  const back = $('#backInput').value.trim();
  let valid = true;
  $('#errFront').textContent = ''; $('#errBack').textContent = '';
  if (front.length < 3) { $('#errFront').textContent = 'Minimal 3 karakter & tidak boleh kosong.'; valid = false; }
  if (back.length < 3) { $('#errBack').textContent = 'Minimal 3 karakter & tidak boleh kosong.'; valid = false; }
  if (!valid) return;

  const tags = $('#tagInput').value.split(',').map(t => t.trim()).filter(Boolean);
  const editId = $('#editId').value;
  const data = {
    front, back,
    category: $('#categoryInput').value,
    difficulty: $('#difficultyInput').value,
    deck: $('#deckInput').value,
    tags
  };

  if (editId) {
    const c = cards.find(x => x.id === editId);
    Object.assign(c, data);
    toast('✏️ Flashcard diperbarui!');
    $('#editId').value = '';
    $('#saveBtn').textContent = 'Simpan Flashcard';
  } else {
    cards.push({ id: uid(), ...data, fav: false, created: Date.now() });
    toast('✅ Flashcard tersimpan!');
  }
  saveAll();
  e.target.reset();
  renderAll();
});

$('#resetBtn').addEventListener('click', () => {
  $('#editId').value = '';
  $('#saveBtn').textContent = 'Simpan Flashcard';
  $('#errFront').textContent = ''; $('#errBack').textContent = '';
});

function editCard(id) {
  const c = cards.find(x => x.id === id); if (!c) return;
  $('#frontInput').value = c.front;
  $('#backInput').value = c.back;
  $('#categoryInput').value = c.category;
  $('#difficultyInput').value = c.difficulty;
  $('#deckInput').value = c.deck;
  $('#tagInput').value = c.tags.join(', ');
  $('#editId').value = id;
  $('#saveBtn').textContent = 'Update Flashcard';
  $('#create').scrollIntoView({ behavior: 'smooth' });
  toast('✏️ Mode edit aktif');
}

function deleteCard(id) {
  if (!confirm('Hapus flashcard ini?')) return;
  cards = cards.filter(x => x.id !== id);
  saveAll(); renderAll();
  toast('🗑️ Flashcard dihapus');
}

function toggleFav(id) {
  const c = cards.find(x => x.id === id); if (!c) return;
  c.fav = !c.fav; saveAll(); renderAll();
  toast(c.fav ? '⭐ Ditambahkan ke favorit' : 'Dihapus dari favorit');
}

/* ===================== RENDER FLASHCARDS ===================== */
function getFiltered() {
  let list = [...cards];
  const q = $('#searchInput').value.toLowerCase().trim();
  const cat = $('#filterCategory').value;
  const diff = $('#filterDifficulty').value;
  const deck = $('#filterDeck').value;
  const favOnly = $('#filterFav').checked;
  const sort = $('#sortBy').value;

  if (q) list = list.filter(c => (c.front + c.back + c.tags.join(' ')).toLowerCase().includes(q));
  if (cat) list = list.filter(c => c.category === cat);
  if (diff) list = list.filter(c => c.difficulty === diff);
  if (deck) list = list.filter(c => c.deck === deck);
  if (favOnly) list = list.filter(c => c.fav);

  if (sort === 'new') list.sort((a, b) => b.created - a.created);
  else if (sort === 'old') list.sort((a, b) => a.created - b.created);
  else if (sort === 'az') list.sort((a, b) => a.front.localeCompare(b.front));
  return list;
}

function renderCards() {
  const grid = $('#cardGrid');
  const list = getFiltered();
  $('#emptyState').style.display = list.length ? 'none' : 'block';
  grid.innerHTML = list.map((c, i) => `
    <div class="flashcard" data-id="${c.id}" style="animation-delay:${i * 0.05}s">
      <div class="flashcard-inner">
        <div class="card-face card-front">
          <div class="card-actions">
            <button class="${c.fav ? 'fav-on' : ''}" data-act="fav" title="Favorit">★</button>
            <button data-act="edit" title="Edit">✏️</button>
            <button data-act="del" title="Hapus">🗑️</button>
            <button data-act="share" title="Share">🔗</button>
          </div>
          <div class="card-text">${esc(c.front)}</div>
          <div class="card-tags">${c.tags.map(t => `<span class="tag-chip">#${esc(t)}</span>`).join('')}</div>
          <div class="card-hint">Klik untuk membalik 🔄</div>
        </div>
        <div class="card-face card-back">
          <div class="card-actions"><button data-act="share" title="Share">🔗</button></div>
          <div class="card-text">${esc(c.back)}</div>
          <div class="card-meta">
            <span class="meta-badge cat-badge">${esc(c.category)}</span>
            <span class="meta-badge diff-${c.difficulty}">${c.difficulty}</span>
          </div>
          <div class="card-hint">Klik untuk membalik 🔄</div>
        </div>
      </div>
    </div>`).join('');
}

// flip + actions delegation
$('#cardGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.flashcard'); if (!card) return;
  const id = card.dataset.id;
  const actBtn = e.target.closest('[data-act]');
  if (actBtn) {
    e.stopPropagation();
    const act = actBtn.dataset.act;
    if (act === 'fav') toggleFav(id);
    else if (act === 'edit') editCard(id);
    else if (act === 'del') deleteCard(id);
    else if (act === 'share') openShare(id);
    return;
  }
  card.classList.toggle('flipped');
});

/* ===================== DECK SYSTEM ===================== */
function renderDecks() {
  const grid = $('#deckGrid');
  grid.innerHTML = decks.map(d => {
    const count = cards.filter(c => c.deck === d).length;
    const pct = cards.length ? Math.round((count / cards.length) * 100) : 0;
    return `
    <div class="deck-card slide-up">
      <h4>📁 ${esc(d)}</h4>
      <div class="deck-count">${count} flashcard</div>
      <div class="deck-bar"><div style="width:${pct}%"></div></div>
      <div class="deck-actions">
        <button data-deck="${esc(d)}" data-dact="rename">✏️ Rename</button>
        <button data-deck="${esc(d)}" data-dact="del">🗑️ Hapus</button>
      </div>
    </div>`;
  }).join('');
}

$('#addDeckBtn').addEventListener('click', () => {
  const name = prompt('Nama deck baru:');
  if (!name || !name.trim()) return;
  const n = name.trim();
  if (decks.includes(n)) return toast('⚠️ Deck sudah ada');
  decks.push(n); saveAll(); renderAll();
  toast('📚 Deck dibuat!');
});

$('#deckGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-dact]'); if (!btn) return;
  const d = btn.dataset.deck; const act = btn.dataset.dact;
  if (act === 'rename') {
    const nn = prompt('Nama baru untuk deck:', d);
    if (!nn || !nn.trim() || nn.trim() === d) return;
    if (decks.includes(nn.trim())) return toast('⚠️ Deck sudah ada');
    cards.forEach(c => { if (c.deck === d) c.deck = nn.trim(); });
    decks[decks.indexOf(d)] = nn.trim();
    saveAll(); renderAll(); toast('✏️ Deck di-rename');
  } else if (act === 'del') {
    if (decks.length <= 1) return toast('⚠️ Minimal harus ada 1 deck');
    if (!confirm(`Hapus deck "${d}"? Flashcard akan dipindah ke deck lain.`)) return;
    const fallback = decks.find(x => x !== d);
    cards.forEach(c => { if (c.deck === d) c.deck = fallback; });
    decks = decks.filter(x => x !== d);
    saveAll(); renderAll(); toast('🗑️ Deck dihapus');
  }
});

/* ===================== FILTERS LISTENERS ===================== */
['searchInput', 'filterCategory', 'filterDifficulty', 'filterDeck', 'sortBy'].forEach(id =>
  $('#' + id).addEventListener('input', renderCards));
$('#filterFav').addEventListener('change', renderCards);

/* ===================== STATS ===================== */
function renderStats() {
  $('#statTotalCards').textContent = cards.length;
  $('#statTotalDecks').textContent = decks.length;
  $('#statFav').textContent = cards.filter(c => c.fav).length;
  $('#statQuiz').textContent = stats.quizDone;
  const totalAns = stats.correct + stats.wrong;
  const acc = totalAns ? Math.round((stats.correct / totalAns) * 100) : 0;
  $('#statAcc').textContent = acc + '%';
  $('#statTime').textContent = Math.round(stats.studyTime / 60) + 'm';
  // hero
  $('#heroStatCards').textContent = cards.length;
  $('#heroStatDecks').textContent = decks.length;
  $('#heroStatStreak').textContent = updateStreak();
}

/* ===================== CARD OF THE DAY ===================== */
function renderCardOfDay() {
  if (!cards.length) { $('#cotdBody').textContent = 'Belum ada flashcard. Buat dulu yuk!'; return; }
  const seed = new Date().getDate() + new Date().getMonth() * 31;
  const c = cards[seed % cards.length];
  $('#cotdBody').innerHTML = `<strong>${esc(c.front)}</strong> → ${esc(c.back)} <em>(${esc(c.category)})</em>`;
}

/* ===================== QUIZ MODE ===================== */
let quizState = null;
let quizTimerInterval = null;

$('#startQuizBtn').addEventListener('click', startQuiz);
$('#quizRestartBtn').addEventListener('click', () => {
  $('#quizResult').style.display = 'none';
  $('#quizSetup').style.display = 'block';
});

function startQuiz() {
  const deck = $('#quizDeck').value;
  let pool = deck ? cards.filter(c => c.deck === deck) : [...cards];
  if (!pool.length) return toast('⚠️ Belum ada flashcard untuk quiz');
  if ($('#quizShuffle').checked) pool = shuffle(pool);

  quizState = {
    queue: [...pool], index: 0, total: pool.length,
    correct: 0, wrong: 0, wrongCards: [],
    repeatWrong: $('#quizRepeatWrong').checked,
    timerOn: $('#quizTimer').checked, time: 0
  };

  $('#quizSetup').style.display = 'none';
  $('#quizResult').style.display = 'none';
  $('#quizActive').style.display = 'block';

  if (quizState.timerOn) {
    clearInterval(quizTimerInterval);
    quizTimerInterval = setInterval(() => {
      quizState.time++;
      const m = String(Math.floor(quizState.time / 60)).padStart(2, '0');
      const s = String(quizState.time % 60).padStart(2, '0');
      $('#quizTimerDisplay').textContent = `⏱️ ${m}:${s}`;
    }, 1000);
  } else $('#quizTimerDisplay').textContent = '';

  showQuizCard();
}

function showQuizCard() {
  const q = quizState;
  if (q.index >= q.queue.length) return endQuiz();
  const c = q.queue[q.index];
  $('#quizCard').classList.remove('flipped');
  $('#quizCatBadge').textContent = c.category + ' • ' + c.difficulty;
  $('#quizFront').textContent = c.front;
  $('#quizBack').textContent = c.back;
  $('#quizCounter').textContent = `${q.index + 1} / ${q.queue.length}`;
  $('#quizProgress').style.width = ((q.index) / q.queue.length * 100) + '%';
  $('#quizFlipBtn').style.display = 'inline-flex';
  $('#quizAnswerBtns').style.display = 'none';
}

function flipQuiz() {
  $('#quizCard').classList.add('flipped');
  $('#quizFlipBtn').style.display = 'none';
  $('#quizAnswerBtns').style.display = 'flex';
}
$('#quizFlipBtn').addEventListener('click', flipQuiz);
$('#quizCard').addEventListener('click', () => {
  if ($('#quizAnswerBtns').style.display === 'none') flipQuiz();
});

$('#quizCorrectBtn').addEventListener('click', () => answerQuiz(true));
$('#quizWrongBtn').addEventListener('click', () => answerQuiz(false));

function answerQuiz(correct) {
  const q = quizState;
  if (correct) { q.correct++; stats.correct++; }
  else {
    q.wrong++; stats.wrong++;
    if (q.repeatWrong) q.wrongCards.push(q.queue[q.index]);
  }
  stats.studyTime += 8; // approx seconds per card
  q.index++;
  // if finished main queue but has wrong cards to repeat
  if (q.index >= q.queue.length && q.repeatWrong && q.wrongCards.length) {
    q.queue = q.queue.concat(q.wrongCards);
    q.wrongCards = [];
    toast('🔁 Mengulang jawaban yang salah');
  }
  saveAll();
  showQuizCard();
}

function endQuiz() {
  clearInterval(quizTimerInterval);
  stats.quizDone++;
  saveAll();
  const q = quizState;
  const total = q.correct + q.wrong;
  const pct = total ? Math.round((q.correct / total) * 100) : 0;
  $('#quizActive').style.display = 'none';
  $('#quizResult').style.display = 'block';
  $('#resultScore').textContent = pct + '%';
  $('#resultCorrect').textContent = q.correct;
  $('#resultWrong').textContent = q.wrong;
  $('#resultEmoji').textContent = pct >= 80 ? '🏆' : pct >= 50 ? '🎉' : '💪';
  renderStats();
  if (pct >= 50) launchConfetti();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ===================== CONFETTI ===================== */
function launchConfetti() {
  const canvas = $('#confettiCanvas');
  canvas.style.display = 'block';
  canvas.width = innerWidth; canvas.height = innerHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444'];
  const parts = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height,
    r: 5 + Math.random() * 7, c: colors[Math.floor(Math.random() * colors.length)],
    vy: 2 + Math.random() * 4, vx: -2 + Math.random() * 4, rot: Math.random() * 360
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach(p => {
      p.y += p.vy; p.x += p.vx; p.rot += 5;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r); ctx.restore();
    });
    frame++;
    if (frame < 200) requestAnimationFrame(draw);
    else { canvas.style.display = 'none'; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  draw();
}

/* ===================== IMPORT / EXPORT ===================== */
$('#exportJsonBtn').addEventListener('click', () => {
  if (!cards.length) return toast('⚠️ Belum ada data');
  download('flashmemo-export.json', JSON.stringify({ cards, decks }, null, 2));
  toast('📤 Export JSON berhasil');
});
$('#exportTxtBtn').addEventListener('click', () => {
  if (!cards.length) return toast('⚠️ Belum ada data');
  const txt = cards.map(c => `${c.front} | ${c.back}`).join('\n');
  download('flashmemo-export.txt', txt);
  toast('📤 Export TXT berhasil');
});
function download(name, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  URL.revokeObjectURL(a.href);
}

$('#importFile').addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const text = ev.target.result;
      let added = 0;
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        const imp = Array.isArray(data) ? data : data.cards || [];
        if (data.decks) data.decks.forEach(d => { if (!decks.includes(d)) decks.push(d); });
        imp.forEach(c => {
          if (c.front && c.back) {
            cards.push({
              id: uid(), front: c.front, back: c.back,
              category: c.category || 'Umum', difficulty: c.difficulty || 'Mudah',
              deck: c.deck && decks.includes(c.deck) ? c.deck : 'Umum',
              tags: c.tags || [], fav: !!c.fav, created: Date.now()
            });
            added++;
          }
        });
      } else {
        text.split('\n').forEach(line => {
          const [f, b] = line.split('|').map(s => s && s.trim());
          if (f && b) {
            cards.push({ id: uid(), front: f, back: b, category: 'Umum', difficulty: 'Mudah', deck: 'Umum', tags: [], fav: false, created: Date.now() });
            added++;
          }
        });
      }
      saveAll(); renderAll();
      toast(`📥 ${added} flashcard diimpor!`);
    } catch (err) { toast('❌ File tidak valid'); }
    e.target.value = '';
  };
  reader.readAsText(file);
});

/* ===================== SHARE ===================== */
let shareData = '';
function openShare(id) {
  const c = cards.find(x => x.id === id); if (!c) return;
  const code = btoa(unescape(encodeURIComponent(JSON.stringify({ f: c.front, b: c.back })))).slice(0, 10);
  const link = `https://flashmemo.app/share/${code}`;
  shareData = `FlashMemo 🃏\n${c.front} → ${c.back}\n${link}`;
  $('#shareLink').value = link;
  $('#shareWa').href = `https://wa.me/?text=${encodeURIComponent(shareData)}`;
  $('#shareTg').href = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(c.front + ' → ' + c.back)}`;
  $('#shareModal').classList.add('show');
}
$('#shareClose').addEventListener('click', () => $('#shareModal').classList.remove('show'));
$('#shareModal').addEventListener('click', (e) => { if (e.target.id === 'shareModal') $('#shareModal').classList.remove('show'); });
$('#copyLinkBtn').addEventListener('click', () => {
  navigator.clipboard.writeText($('#shareLink').value).then(() => toast('🔗 Link disalin!')).catch(() => {
    $('#shareLink').select(); document.execCommand('copy'); toast('🔗 Link disalin!');
  });
});

/* ===================== HERO BUTTONS ===================== */
$('#heroStartBtn').addEventListener('click', () => $('#create').scrollIntoView({ behavior: 'smooth' }));
$('#navCreateBtn').addEventListener('click', () => $('#create').scrollIntoView({ behavior: 'smooth' }));
$('#heroDemoBtn').addEventListener('click', loadDemo);

function loadDemo() {
  if (cards.length && !confirm('Tambahkan flashcard contoh (demo)?')) return;
  const demo = [
    { front: 'Apple', back: 'Apel', category: 'Bahasa', difficulty: 'Mudah', deck: 'Umum', tags: ['vocab'] },
    { front: 'Luas lingkaran', back: 'π × r²', category: 'Matematika', difficulty: 'Sedang', deck: 'Umum', tags: ['rumus'] },
    { front: 'Rumus kecepatan', back: 'v = s / t', category: 'Sains', difficulty: 'Mudah', deck: 'Umum', tags: ['fisika'] },
    { front: 'Tahun Proklamasi Indonesia', back: '17 Agustus 1945', category: 'Sejarah', difficulty: 'Mudah', deck: 'Umum', tags: ['sejarah'] },
    { front: 'Ibukota Jepang', back: 'Tokyo', category: 'Umum', difficulty: 'Mudah', deck: 'Umum', tags: ['geografi'] },
    { front: 'H₂O adalah', back: 'Air', category: 'Sains', difficulty: 'Mudah', deck: 'Umum', tags: ['kimia'] }
  ];
  demo.forEach(d => cards.push({ id: uid(), ...d, fav: false, created: Date.now() }));
  saveAll(); renderAll();
  toast('🎬 Demo dimuat!');
  $('#viewer').scrollIntoView({ behavior: 'smooth' });
}

/* ===================== KEYBOARD SHORTCUTS ===================== */
document.addEventListener('keydown', (e) => {
  const quizVisible = $('#quizActive').style.display === 'block';
  if (!quizVisible) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if ($('#quizAnswerBtns').style.display === 'none') flipQuiz();
  } else if (e.code === 'Enter') {
    e.preventDefault();
    if ($('#quizAnswerBtns').style.display !== 'none') answerQuiz(true);
  }
});

/* ===================== RENDER ALL ===================== */
function renderAll() {
  refreshDeckSelects();
  renderCards();
  renderDecks();
  renderStats();
  renderCardOfDay();
}

/* ===================== INIT ===================== */
initTheme();
renderAll();
