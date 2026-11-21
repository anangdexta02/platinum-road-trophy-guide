/* PLATINUM ROAD — tracker logic.
   Loads the official trophy list (data/trophies.json), the enrichment
   (data/guide.json: hidden flags, kinds, the one missable trophy, the
   unconfirmed methods) and the route (data/roadmap.json), merges them by
   trophy id, and renders a checklist + roadmap that share one progress
   state. Progress lives in localStorage under 'platinum-road-v1'. */

'use strict';

var STORAGE_KEY = 'platinum-road-v1';
var POINTS_DEFAULT = { bronze: 15, silver: 30, gold: 90, platinum: 300 };
var GRADES = ['platinum', 'gold', 'silver', 'bronze'];
var RING_CIRCUMFERENCE = 263.9; // 2 * pi * 42, matches the SVG in index.html

var state = {
  trophies: [],          // merged trophy objects, in list order
  byId: {},              // id -> merged trophy
  roadmap: null,
  points: POINTS_DEFAULT,
  earned: new Set(),
  revealed: new Set(),
  grade: 'all',
  status: 'all',
  missableOnly: false,
  query: '',
  view: 'checklist'
};

/* ---------------- persistence ---------------- */

function loadProgress() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    var saved = JSON.parse(raw);
    if (Array.isArray(saved.earned)) state.earned = new Set(saved.earned);
    if (Array.isArray(saved.revealed)) state.revealed = new Set(saved.revealed);
  } catch (err) {
    /* a corrupt save must never break the guide */
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      earned: Array.from(state.earned),
      revealed: Array.from(state.revealed)
    }));
  } catch (err) {
    /* storage full/blocked: the session still works, it just won't persist */
  }
}

/* ---------------- data ---------------- */

function fetchJson(url) {
  return fetch(url).then(function (res) {
    if (!res.ok) throw new Error(url + ' -> HTTP ' + res.status);
    return res.json();
  });
}

function mergeData(trophiesDoc, guideDoc, roadmapDoc) {
  var list = Array.isArray(trophiesDoc) ? trophiesDoc : trophiesDoc.trophies;
  var enrichment = (guideDoc && guideDoc.trophies) || {};
  if (guideDoc && guideDoc.points) state.points = guideDoc.points;
  state.roadmap = roadmapDoc || null;
  state.trophies = list.map(function (t) {
    var extra = enrichment[String(t.id)] || enrichment[t.id] || {};
    var merged = {
      id: t.id,
      name: t.name,
      description: t.description,
      grade: t.grade,
      guide: t.guide || '',
      hidden: !!extra.hidden,
      kind: extra.kind || 'misc',
      missable: !!extra.missable,
      missableReason: extra.missableReason || '',
      unconfirmed: !!extra.unconfirmed,
      methodNote: extra.methodNote || ''
    };
    state.byId[merged.id] = merged;
    return merged;
  });
}

/* ---------------- helpers ---------------- */

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function isMasked(t) {
  return t.hidden && !state.revealed.has(t.id) && !state.earned.has(t.id);
}

function pointsOf(t) {
  return state.points[t.grade] || 0;
}

function matchesFilters(t) {
  if (state.grade !== 'all' && t.grade !== state.grade) return false;
  if (state.status === 'earned' && !state.earned.has(t.id)) return false;
  if (state.status === 'remaining' && state.earned.has(t.id)) return false;
  if (state.missableOnly && !t.missable) return false;
  if (state.query) {
    var q = state.query.toLowerCase();
    var haystack;
    if (isMasked(t)) {
      haystack = 'hidden trophy ' + t.kind;
    } else {
      haystack = (t.name + ' ' + t.description + ' ' + t.guide + ' ' + t.kind).toLowerCase();
    }
    if (haystack.indexOf(q) === -1) return false;
  }
  return true;
}

/* ---------------- rendering: shared card ---------------- */

function buildCard(t) {
  var masked = isMasked(t);
  var earned = state.earned.has(t.id);
  var card = el('article', 'trophy-card grade-' + t.grade + (earned ? ' earned' : '') + (masked ? ' masked' : ''));
  card.setAttribute('data-id', String(t.id));

  var checkWrap = el('div', 'trophy-check');
  var checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = earned;
  checkbox.disabled = masked;
  checkbox.setAttribute('aria-label', 'Mark "' + (masked ? 'hidden trophy' : t.name) + '" as earned');
  checkbox.addEventListener('change', function () {
    toggleEarned(t.id, checkbox.checked);
  });
  checkWrap.appendChild(checkbox);
  card.appendChild(checkWrap);

  var body = el('div', 'trophy-body');
  var head = el('div', 'trophy-head');
  head.appendChild(el('span', 'trophy-name', masked ? 'Hidden trophy' : t.name));
  head.appendChild(el('span', 'grade-pill grade-' + t.grade, t.grade));
  if (t.hidden) head.appendChild(el('span', 'badge badge-hidden', 'Hidden'));
  if (t.missable) head.appendChild(el('span', 'badge badge-missable', 'Missable'));
  if (t.unconfirmed && !masked) head.appendChild(el('span', 'badge badge-unconfirmed', 'Method unconfirmed'));
  if (!masked) head.appendChild(el('span', 'badge badge-kind', t.kind));
  body.appendChild(head);

  if (masked) {
    body.appendChild(el('p', 'trophy-desc', 'Hidden trophy — click to reveal'));
    body.appendChild(el('p', 'reveal-hint', 'This trophy is hidden on PlayStation. Its name and guide stay masked until you reveal it, so the checklist is safe to browse spoiler-free.'));
    card.addEventListener('click', function () {
      state.revealed.add(t.id);
      saveProgress();
      render();
    });
  } else {
    body.appendChild(el('p', 'trophy-desc', t.description));
    if (t.guide) {
      var guide = el('p', 'trophy-guide');
      guide.appendChild(el('span', 'guide-label', 'Guide: '));
      guide.appendChild(document.createTextNode(t.guide));
      body.appendChild(guide);
    }
    if (t.missable && t.missableReason) {
      body.appendChild(el('p', 'trophy-missable-reason', '⚠ ' + t.missableReason));
    }
    if (t.unconfirmed && t.methodNote) {
      body.appendChild(el('p', 'trophy-note', t.methodNote));
    }
  }

  card.appendChild(body);
  return card;
}

/* ---------------- rendering: views ---------------- */

function renderChecklist() {
  var wrap = document.getElementById('checklist');
  wrap.textContent = '';
  var visible = state.trophies.filter(matchesFilters);
  visible.forEach(function (t) { wrap.appendChild(buildCard(t)); });
  document.getElementById('empty-state').hidden = visible.length > 0;
  document.getElementById('result-count').textContent =
    'Showing ' + visible.length + ' of ' + state.trophies.length + ' trophies' +
    (state.missableOnly ? ' — missable only' : '') +
    (state.grade !== 'all' ? ' — ' + state.grade : '') +
    (state.status !== 'all' ? ' — ' + state.status : '');
}

function renderRoadmap() {
  var about = document.getElementById('roadmap-about');
  var difficulty = document.getElementById('roadmap-difficulty');
  var wrap = document.getElementById('roadmap');
  wrap.textContent = '';
  if (!state.roadmap) {
    about.textContent = 'The roadmap data could not be loaded.';
    return;
  }
  about.textContent = state.roadmap.about || '';
  difficulty.textContent = state.roadmap.difficultyNotes || '';
  state.roadmap.phases.forEach(function (phase, idx) {
    var section = el('section', 'phase');
    var head = el('div', 'phase-head');
    head.appendChild(el('span', 'phase-step', 'Phase ' + (idx + 1)));
    head.appendChild(el('span', 'phase-name', phase.name));
    var done = phase.trophyIds.filter(function (id) { return state.earned.has(id); }).length;
    head.appendChild(el('span', 'phase-progress', done + ' / ' + phase.trophyIds.length + ' done'));
    section.appendChild(head);
    section.appendChild(el('p', 'phase-goal', phase.goal));
    phase.trophyIds.forEach(function (id) {
      var t = state.byId[id];
      if (t) section.appendChild(buildCard(t));
    });
    wrap.appendChild(section);
  });
}

function renderSummary() {
  var total = state.trophies.length;
  var earnedCount = state.earned.size;
  var pct = total ? Math.round((earnedCount / total) * 100) : 0;
  var pointsEarned = 0;
  var pointsTotal = 0;
  state.trophies.forEach(function (t) {
    pointsTotal += pointsOf(t);
    if (state.earned.has(t.id)) pointsEarned += pointsOf(t);
  });
  document.getElementById('earned-count').textContent = String(earnedCount);
  document.getElementById('points-earned').textContent = String(pointsEarned);
  document.getElementById('points-total').textContent = String(pointsTotal);
  document.getElementById('percent').textContent = pct + '%';
  document.getElementById('ring-value').style.strokeDashoffset =
    String(RING_CIRCUMFERENCE * (1 - earnedCount / (total || 1)));
  var platinum = state.byId[1];
  document.getElementById('platinum-status').textContent =
    platinum && state.earned.has(1)
      ? 'earned — Leonida legend'
      : (total - earnedCount) + ' trophies to go';
}

function renderBanner() {
  var banner = document.getElementById('missable-banner');
  banner.hidden = !(state.missableOnly || !state.earned.has(28));
}

function render() {
  renderSummary();
  renderBanner();
  renderChecklist();
  renderRoadmap();
  document.getElementById('checklist-view').hidden = state.view !== 'checklist';
  document.getElementById('roadmap-view').hidden = state.view !== 'roadmap';
  var toggle = document.getElementById('view-toggle');
  toggle.setAttribute('aria-pressed', state.view === 'roadmap' ? 'true' : 'false');
  toggle.textContent = state.view === 'roadmap' ? 'Checklist' : 'Roadmap';
}

/* ---------------- actions ---------------- */

function toggleEarned(id, on) {
  if (on) state.earned.add(id); else state.earned.delete(id);
  saveProgress();
  render();
}

function exportProgress() {
  var payload = {
    app: 'platinum-road',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: Array.from(state.earned).sort(function (a, b) { return a - b; }),
    revealed: Array.from(state.revealed).sort(function (a, b) { return a - b; })
  };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'platinum-road-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
}

function importProgress(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var data = JSON.parse(String(reader.result));
      var valid = function (list) {
        return Array.isArray(list)
          ? list.filter(function (id) { return state.byId[id]; })
          : [];
      };
      state.earned = new Set(valid(data.earned));
      state.revealed = new Set(valid(data.revealed));
      saveProgress();
      render();
    } catch (err) {
      alert('That file is not a Platinum Road progress export.');
    }
  };
  reader.readAsText(file);
}

function resetProgress() {
  if (!window.confirm('Reset all Platinum Road progress in this browser? This cannot be undone.')) return;
  state.earned = new Set();
  state.revealed = new Set();
  saveProgress();
  render();
}

/* ---------------- wiring ---------------- */

function wireToolbar() {
  document.getElementById('search').addEventListener('input', function (ev) {
    state.query = ev.target.value.trim();
    renderChecklist();
  });

  /* Pressing "/" anywhere outside a text field jumps to the search box. */
  document.addEventListener('keydown', function (ev) {
    var tag = document.activeElement && document.activeElement.tagName;
    if (ev.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      ev.preventDefault();
      document.getElementById('search').focus();
    }
  });

  document.getElementById('grade-filters').addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-grade]');
    if (!btn) return;
    state.grade = btn.getAttribute('data-grade');
    syncGradeChips();
    renderChecklist();
  });

  document.getElementById('status-filters').addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-status]');
    if (!btn) return;
    state.status = btn.getAttribute('data-status');
    var chips = document.querySelectorAll('#status-filters .chip');
    chips.forEach(function (c) { c.classList.toggle('active', c === btn); });
    renderChecklist();
  });

  document.getElementById('missable-toggle').addEventListener('change', function (ev) {
    state.missableOnly = ev.target.checked;
    renderBanner();
    renderChecklist();
  });

  document.getElementById('view-toggle').addEventListener('click', function () {
    state.view = state.view === 'roadmap' ? 'checklist' : 'roadmap';
    render();
  });

  document.getElementById('export-btn').addEventListener('click', exportProgress);
  document.getElementById('reset-btn').addEventListener('click', resetProgress);
  document.getElementById('import-file').addEventListener('change', function (ev) {
    if (ev.target.files && ev.target.files[0]) importProgress(ev.target.files[0]);
    ev.target.value = '';
  });
}

function syncGradeChips() {
  var chips = document.querySelectorAll('#grade-filters .chip');
  chips.forEach(function (c) {
    c.classList.toggle('active', c.getAttribute('data-grade') === state.grade);
  });
}

/* ---------------- boot ---------------- */

function applyUrlParams() {
  var params = new URLSearchParams(window.location.search);
  var grade = params.get('grade');
  if (grade && (grade === 'all' || GRADES.indexOf(grade) !== -1)) {
    state.grade = grade;
    syncGradeChips();
  }
  if (params.get('view') === 'roadmap') state.view = 'roadmap';
  return params;
}

function boot() {
  loadProgress();
  var params = applyUrlParams();
  wireToolbar();
  Promise.all([
    fetchJson('data/trophies.json'),
    fetchJson('data/guide.json'),
    fetchJson('data/roadmap.json')
  ]).then(function (docs) {
    mergeData(docs[0], docs[1], docs[2]);
    render();
    var scroll = parseInt(params.get('scroll') || '', 10);
    if (!isNaN(scroll) && scroll > 0) {
      requestAnimationFrame(function () { window.scrollTo(0, scroll); });
    }
    window.__platinumRoadReady = true;
  }).catch(function (err) {
    var list = document.getElementById('checklist');
    list.textContent = '';
    list.appendChild(el('p', 'empty-state', 'The trophy data could not be loaded (' + err.message + '). Serve this folder over HTTP — see the README — rather than opening the file directly.'));
    window.__platinumRoadReady = true;
  });
}

document.addEventListener('DOMContentLoaded', boot);
