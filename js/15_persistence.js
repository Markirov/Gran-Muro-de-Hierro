/* ======================================================================
   PERSISTENCE
   ====================================================================== */

function loadIndex() {
  try {
    const raw = localStorage.getItem(STORAGE_INDEX);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveIndex(idx) {
  localStorage.setItem(STORAGE_INDEX, JSON.stringify(idx));
}

/* ─── Sub-GH-A: GitHub backup serialize/deserialize ───────────────────
 *
 * Recoge todo el estado persistido en localStorage (bandas + campañas +
 * settings UI + history) en un objeto JSON único para backup en GitHub
 * Gist. Round-trip: deserializeAppState(serializeAppState()) preserva
 * datos a la perfección.
 *
 * Prefijos canon:
 *   - warband-forge-v1:<wbId>            → bandas individuales
 *   - warband-forge-v1:cmp:<cId>         → campañas individuales
 *   - warband-forge-index                → índice de bandas
 *   - warband-forge-campaigns-index      → índice de campañas
 *   - warband-forge-v1:current           → puntero a banda actual
 *   - warband-forge-v1:mode              → modo activo (banda/campana/lab/battle)
 *
 * Settings UI preservadas:
 *   - wf.ui.bandaSubtab
 *   - wf.ui.factionSidebarOpen
 *   - wf-tour-seen
 *   - wf_sim_history (cap 100 entradas)
 */
const _SETTINGS_KEYS = [
  'wf.ui.bandaSubtab',
  'wf.ui.factionSidebarOpen',
  'wf-tour-seen',
  'wf_sim_history',
  'warband-forge-v1:current',
  'warband-forge-v1:mode',
  'warband-forge-current-campaign',
];

function serializeAppState() {
  const warbands = [];
  const campaigns = [];
  const settings = {};
  if (typeof localStorage === 'undefined') {
    return { version: 1, exportedAt: new Date().toISOString(), warbands, campaigns, settings };
  }
  // Recoge bandas (prefix warband-forge-v1:<id>) excluyendo subkeys con ':'
  // adicionales (current, mode, cmp:).
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.indexOf('warband-forge-v1:') === 0 &&
        k.indexOf('warband-forge-v1:cmp:') !== 0 &&
        k !== 'warband-forge-v1:current' &&
        k !== 'warband-forge-v1:mode') {
      try {
        const wb = JSON.parse(localStorage.getItem(k));
        if (wb && wb.id) warbands.push(wb);
      } catch (e) {}
    } else if (k.indexOf('warband-forge-v1:cmp:') === 0) {
      try {
        const c = JSON.parse(localStorage.getItem(k));
        if (c && c.id) campaigns.push(c);
      } catch (e) {}
    }
  }
  // Settings explícitas + indexes.
  for (const sk of _SETTINGS_KEYS) {
    const v = localStorage.getItem(sk);
    if (v != null) settings[sk] = v;
  }
  const idxWb = localStorage.getItem('warband-forge-index');
  if (idxWb != null) settings['warband-forge-index'] = idxWb;
  const idxCmp = localStorage.getItem('warband-forge-campaigns-index');
  if (idxCmp != null) settings['warband-forge-campaigns-index'] = idxCmp;
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    warbands,
    campaigns,
    settings,
    deleted: loadDeletedMarks(),
  };
}

/* Marcas de borrado ({ warbands: {id: fecha}, campaigns: {id: fecha} }):
 * evitan que la sincronización resucite lo borrado en otro dispositivo. */
const DELETED_MARKS_KEY = 'warband-forge-deleted';
function loadDeletedMarks() {
  try {
    const d = JSON.parse(localStorage.getItem(DELETED_MARKS_KEY) || '{}') || {};
    return { warbands: d.warbands || {}, campaigns: d.campaigns || {} };
  } catch (e) { return { warbands: {}, campaigns: {} }; }
}
function markDeleted(kind, id) {
  if (typeof localStorage === 'undefined' || !id) return;
  const d = loadDeletedMarks();
  d[kind][id] = new Date().toISOString();
  localStorage.setItem(DELETED_MARKS_KEY, JSON.stringify(d));
}

/* Fusiona el estado del dispositivo con el de la nube: de cada banda o
 * campaña gana la versión con updatedAt más reciente; lo borrado después de
 * su última edición no vuelve. Los ajustes del dispositivo mandan y los que
 * falten vienen de la nube (los índices se reconstruyen al aplicar). */
function mergeAppStates(local, remote) {
  local = local || {}; remote = remote || {};
  const ts = (x) => String((x && x.updatedAt) || '');
  const deleted = { warbands: {}, campaigns: {} };
  for (const src of [remote.deleted, local.deleted]) {
    for (const kind of ['warbands', 'campaigns']) {
      for (const [id, t] of Object.entries((src && src[kind]) || {})) {
        if (!deleted[kind][id] || t > deleted[kind][id]) deleted[kind][id] = t;
      }
    }
  }
  const mergeList = (kind) => {
    const out = new Map();
    for (const x of (remote[kind] || []).concat(local[kind] || [])) {
      if (!x || !x.id) continue;
      const cur = out.get(x.id);
      if (!cur || ts(x) >= ts(cur)) out.set(x.id, x);
    }
    for (const [id, x] of out) {
      const del = deleted[kind][id];
      if (del && del >= ts(x)) out.delete(id);
      else if (del) delete deleted[kind][id];
    }
    return Array.from(out.values());
  };
  const settings = Object.assign({}, remote.settings || {}, local.settings || {});
  delete settings['warband-forge-index'];
  delete settings['warband-forge-campaigns-index'];
  return { version: 1, exportedAt: new Date().toISOString(),
           warbands: mergeList('warbands'), campaigns: mergeList('campaigns'),
           settings, deleted };
}

/* Escribe en el navegador un estado fusionado: guarda bandas y campañas,
 * quita las borradas y reconstruye los índices. */
function applyMergedState(state) {
  if (!state || typeof localStorage === 'undefined') return;
  for (const wb of (state.warbands || [])) {
    if (wb && wb.id) localStorage.setItem('warband-forge-v1:' + wb.id, JSON.stringify(wb));
  }
  for (const c of (state.campaigns || [])) {
    if (c && c.id) localStorage.setItem('warband-forge-v1:cmp:' + c.id, JSON.stringify(c));
  }
  const del = state.deleted || { warbands: {}, campaigns: {} };
  for (const id of Object.keys(del.warbands || {})) localStorage.removeItem('warband-forge-v1:' + id);
  for (const id of Object.keys(del.campaigns || {})) localStorage.removeItem('warband-forge-v1:cmp:' + id);
  localStorage.setItem(DELETED_MARKS_KEY, JSON.stringify(del));
  for (const [k, v] of Object.entries(state.settings || {})) {
    if (v != null && localStorage.getItem(k) == null) localStorage.setItem(k, v);
  }
  // Índices desde lo que queda guardado.
  const wbIdx = [], cmpIdx = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || k.indexOf('warband-forge-v1:') !== 0 ||
        k === 'warband-forge-v1:current' || k === 'warband-forge-v1:mode') continue;
    let o = null;
    try { o = JSON.parse(localStorage.getItem(k)); } catch (e) {}
    if (!o || !o.id) continue;
    if (k.indexOf('warband-forge-v1:cmp:') === 0) {
      cmpIdx.push({ id: o.id, name: o.name, warbands: (o.warbandIds || []).length,
                    battles: (o.battles || []).length, updatedAt: o.updatedAt });
    } else {
      wbIdx.push({ id: o.id, name: o.name || '(Sin nombre)', factionId: o.factionId,
                   models: (o.models || []).length, updatedAt: o.updatedAt });
    }
  }
  localStorage.setItem('warband-forge-index', JSON.stringify(wbIdx));
  localStorage.setItem('warband-forge-campaigns-index', JSON.stringify(cmpIdx));
}

function deserializeAppState(state) {
  if (!state || typeof state !== 'object') {
    return { ok: false, error: 'Estado inválido (no es objeto).' };
  }
  if (!Array.isArray(state.warbands)) {
    return { ok: false, error: 'Campo "warbands" debe ser array.' };
  }
  if (typeof localStorage === 'undefined') {
    return { ok: false, error: 'localStorage no disponible.' };
  }
  // Restaura bandas.
  for (const wb of state.warbands) {
    if (wb && wb.id) {
      localStorage.setItem('warband-forge-v1:' + wb.id, JSON.stringify(wb));
    }
  }
  // Restaura campañas.
  for (const c of (state.campaigns || [])) {
    if (c && c.id) {
      localStorage.setItem('warband-forge-v1:cmp:' + c.id, JSON.stringify(c));
    }
  }
  // Restaura settings.
  const settings = state.settings || {};
  for (const k of Object.keys(settings)) {
    if (settings[k] != null) localStorage.setItem(k, settings[k]);
  }
  if (state.deleted) localStorage.setItem(DELETED_MARKS_KEY, JSON.stringify(state.deleted));
  return { ok: true };
}

/* ─── Sub-FB-A: Firebase config + helpers ─────────────────────────
 *
 * Login con Google + storage en Firestore. Sync transparente entre
 * dispositivos. Usuario solo pulsa "Continuar con Google" una vez por
 * navegador y se queda logueado.
 *
 * SETUP (Marcos, una vez):
 *   1. https://console.firebase.google.com → "Add project"
 *   2. Authentication → Sign-in method → Google → Enable
 *   3. Firestore Database → Create database (test mode OK al inicio)
 *   4. Project settings → General → "Your apps" → web (</>) → Register
 *   5. Copia firebaseConfig JSON → pégalo abajo en FIREBASE_CONFIG
 *   6. Firestore Rules → permite solo dueño leer/escribir su doc:
 *        rules_version='2'; service cloud.firestore {
 *          match /databases/{db}/documents {
 *            match /users/{uid} {
 *              allow read, write: if request.auth!=null && request.auth.uid==uid;
 *            }
 *          }
 *        }
 *
 * Si FIREBASE_CONFIG.apiKey está vacío, todo el sistema queda inactivo
 * (fallback al sistema GitHub PAT/OAuth previo).
 */
// Config web del proyecto (pública por diseño; la seguridad está en las
// reglas de Firestore). Sin Analytics: la app no recoge datos.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBYu_vNIewXBSFWwCnBkGesUmnE5DxMkls",
  authDomain: "murodehierrodelsultanato.firebaseapp.com",
  projectId: "murodehierrodelsultanato",
  storageBucket: "murodehierrodelsultanato.firebasestorage.app",
  messagingSenderId: "213214152556",
  appId: "1:213214152556:web:79e32c4d3ee9afd7fed549",
};

let _fbApp = null, _fbAuth = null, _fbDb = null, _fbUser = null;
let _fbReady = false;
let _fbModuleCache = null;

function isFirebaseConfigured() {
  return !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey &&
            FIREBASE_CONFIG.projectId);
}

async function _fbLoadModules() {
  if (_fbModuleCache) return _fbModuleCache;
  // Carga dinámica via ES module imports desde CDN gstatic.
  const ver = '10.13.2';
  const [appMod, authMod, firestoreMod] = await Promise.all([
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/' + ver + '/firebase-app.js'),
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/' + ver + '/firebase-auth.js'),
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/' + ver + '/firebase-firestore.js'),
  ]);
  _fbModuleCache = { appMod, authMod, firestoreMod };
  return _fbModuleCache;
}

async function firebaseInit() {
  if (!isFirebaseConfigured()) return { ok: false, error: 'Firebase no configurado.' };
  if (_fbReady) return { ok: true };
  try {
    const { appMod, authMod, firestoreMod } = await _fbLoadModules();
    _fbApp = appMod.initializeApp(FIREBASE_CONFIG);
    _fbAuth = authMod.getAuth(_fbApp);
    _fbDb = firestoreMod.getFirestore(_fbApp);
    _fbReady = true;
    // Suscribe a cambios de auth — UI puede reaccionar.
    authMod.onAuthStateChanged(_fbAuth, (u) => {
      _fbUser = u;
      if (typeof onFirebaseAuthChanged === 'function') {
        try { onFirebaseAuthChanged(u); } catch (e) { console.warn(e); }
      }
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Carga Firebase falló: ' + (e.message || String(e)) };
  }
}

async function firebaseLoginGoogle() {
  const initRes = await firebaseInit();
  if (!initRes.ok) return initRes;
  try {
    const { authMod } = await _fbLoadModules();
    const provider = new authMod.GoogleAuthProvider();
    const result = await authMod.signInWithPopup(_fbAuth, provider);
    _fbUser = result.user;
    return { ok: true, user: { uid: result.user.uid, email: result.user.email,
                                displayName: result.user.displayName,
                                photoURL: result.user.photoURL } };
  } catch (e) {
    return { ok: false, error: 'Login Google falló: ' + (e.message || String(e)) };
  }
}

async function firebaseLogout() {
  if (!_fbReady) return { ok: true };
  try {
    const { authMod } = await _fbLoadModules();
    await authMod.signOut(_fbAuth);
    _fbUser = null;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

function firebaseCurrentUser() {
  return _fbUser ? {
    uid: _fbUser.uid, email: _fbUser.email,
    displayName: _fbUser.displayName, photoURL: _fbUser.photoURL,
  } : null;
}

async function firebaseSaveState() {
  if (!_fbReady || !_fbUser) return { ok: false, error: 'No autenticado.' };
  try {
    const { firestoreMod } = await _fbLoadModules();
    const ref = firestoreMod.doc(_fbDb, 'users', _fbUser.uid);
    // Nunca pisar la nube a ciegas: se fusiona con lo que haya allí.
    const snap = await firestoreMod.getDoc(ref);
    const remote = snap.exists() && snap.data() ? snap.data().state : null;
    const state = remote ? mergeAppStates(serializeAppState(), remote) : serializeAppState();
    if (remote) applyMergedState(state);
    await firestoreMod.setDoc(ref, { state, updatedAt: new Date().toISOString() });
    return { ok: true, merged: !!remote };
  } catch (e) {
    return { ok: false, error: 'Firestore save: ' + (e.message || String(e)) };
  }
}

async function firebaseLoadState() {
  if (!_fbReady || !_fbUser) return { ok: false, error: 'No autenticado.' };
  try {
    const { firestoreMod } = await _fbLoadModules();
    const ref = firestoreMod.doc(_fbDb, 'users', _fbUser.uid);
    const snap = await firestoreMod.getDoc(ref);
    if (!snap.exists()) return { ok: true, empty: true };
    const data = snap.data();
    if (!data || !data.state) return { ok: true, empty: true };
    const r = deserializeAppState(data.state);
    if (!r.ok) return r;
    return { ok: true, updatedAt: data.updatedAt };
  } catch (e) {
    return { ok: false, error: 'Firestore load: ' + (e.message || String(e)) };
  }
}

/* ─── Sub-OA-A: OAuth Device Flow GitHub ──────────────────────────
 *
 * Permite login transparente con cuenta GitHub sin pegar PAT manual.
 *
 * Flujo (https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow):
 *   1. requestDeviceCode(clientId) → POST /login/device/code → { device_code,
 *      user_code, verification_uri, expires_in, interval }
 *   2. UI muestra user_code + abre verification_uri en nueva tab
 *   3. pollForAccessToken(clientId, device_code, interval, maxAttempts) →
 *      polls /login/oauth/access_token cada `interval` segundos hasta:
 *      · access_token (autorizado → ok:true)
 *      · access_denied / expired_token (ok:false)
 *      · authorization_pending (sigue esperando)
 *      · slow_down (aumenta intervalo en 5s)
 *
 * Requiere OAuth App registrada en https://github.com/settings/applications/new
 * con "Enable Device Flow" activado. client_id es PÚBLICO (se hardcodea en JS),
 * NO se usa client_secret (Device Flow para public clients).
 */

const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';

async function requestDeviceCode(clientId, scope) {
  if (!clientId) return { ok: false, error: 'client_id requerido (OAuth App de GitHub).' };
  scope = scope || 'gist';
  const params = new URLSearchParams({ client_id: clientId, scope });
  try {
    const f = (typeof window !== 'undefined' && window.fetch) ? window.fetch : fetch;
    const res = await f(GITHUB_DEVICE_CODE_URL, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: params.toString(),
    });
    if (!res.ok) return { ok: false, error: 'HTTP ' + res.status };
    const data = await res.json();
    if (data.error) return { ok: false, error: data.error_description || data.error };
    return {
      ok: true,
      device_code: data.device_code,
      user_code: data.user_code,
      verification_uri: data.verification_uri,
      expires_in: data.expires_in || 900,
      interval: data.interval || 5,
    };
  } catch (e) {
    return { ok: false, error: 'Error de red: ' + (e.message || String(e)) };
  }
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollForAccessToken(clientId, deviceCode, interval, maxAttempts) {
  if (!clientId || !deviceCode) return { ok: false, error: 'client_id y device_code requeridos.' };
  interval = interval || 5;
  maxAttempts = maxAttempts || 180;  // ~15min con interval=5s
  let currentInterval = interval;
  const params = new URLSearchParams({
    client_id: clientId,
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  });
  const f = (typeof window !== 'undefined' && window.fetch) ? window.fetch : fetch;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await f(GITHUB_ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: params.toString(),
      });
      const data = await res.json();
      if (data.access_token) {
        return { ok: true, access_token: data.access_token, scope: data.scope };
      }
      if (data.error === 'authorization_pending') {
        await _sleep(currentInterval * 1000);
        continue;
      }
      if (data.error === 'slow_down') {
        currentInterval += 5;
        await _sleep(currentInterval * 1000);
        continue;
      }
      if (data.error === 'access_denied') {
        return { ok: false, error: 'Autorización denegada por el usuario.' };
      }
      if (data.error === 'expired_token') {
        return { ok: false, error: 'Código expirado. Repite el login.' };
      }
      return { ok: false, error: data.error_description || data.error || 'Error desconocido' };
    } catch (e) {
      return { ok: false, error: 'Error de red: ' + (e.message || String(e)) };
    }
  }
  return { ok: false, error: 'Timeout esperando autorización.' };
}

/* ─── Sub-GH-B: GitHub Gist API backup/restore ─────────────────────
 *
 * Backup → PATCH gist existente (si gistId) o POST gist nuevo.
 * Restore → GET gist, deserializa el archivo wf-state.json.
 *
 * Auth: Personal Access Token (PAT) con scope 'gist'. Usuario crea en
 *   https://github.com/settings/tokens
 * Privado: gists con public=false (visibility 'secret').
 *
 * Returns { ok:true, gistId?, htmlUrl? } o { ok:false, error:string }.
 */
const GIST_FILENAME = 'wf-state.json';
const GIST_DESCRIPTION = 'Warband Forge — backup de estado (bandas, campañas, settings)';

async function githubBackup(token, gistId) {
  if (!token) return { ok: false, error: 'Token GitHub requerido (PAT con scope gist).' };
  const state = serializeAppState();
  const body = {
    description: GIST_DESCRIPTION,
    files: { [GIST_FILENAME]: { content: JSON.stringify(state, null, 2) } },
  };
  const url = gistId
    ? 'https://api.github.com/gists/' + encodeURIComponent(gistId)
    : 'https://api.github.com/gists';
  const method = gistId ? 'PATCH' : 'POST';
  if (!gistId) body.public = false;  // Privado por defecto al crear.
  try {
    const res = await (typeof window !== 'undefined' && window.fetch ? window.fetch : fetch)(url, {
      method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let errMsg = 'HTTP ' + res.status;
      try { const j = await res.json(); if (j && j.message) errMsg += ' · ' + j.message; } catch (e) {}
      return { ok: false, error: errMsg };
    }
    const data = await res.json();
    return { ok: true, gistId: data.id, htmlUrl: data.html_url };
  } catch (e) {
    return { ok: false, error: 'Error de red: ' + (e.message || String(e)) };
  }
}

async function githubRestore(token, gistId) {
  if (!token) return { ok: false, error: 'Token GitHub requerido.' };
  if (!gistId) return { ok: false, error: 'Gist ID requerido para restaurar.' };
  const url = 'https://api.github.com/gists/' + encodeURIComponent(gistId);
  try {
    const res = await (typeof window !== 'undefined' && window.fetch ? window.fetch : fetch)(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) {
      let errMsg = 'HTTP ' + res.status;
      try { const j = await res.json(); if (j && j.message) errMsg += ' · ' + j.message; } catch (e) {}
      return { ok: false, error: errMsg };
    }
    const data = await res.json();
    const file = data && data.files && data.files[GIST_FILENAME];
    if (!file || typeof file.content !== 'string') {
      return { ok: false, error: 'El gist no contiene ' + GIST_FILENAME };
    }
    let parsed;
    try { parsed = JSON.parse(file.content); }
    catch (e) { return { ok: false, error: 'JSON inválido en gist: ' + e.message }; }
    const r = deserializeAppState(parsed);
    if (!r.ok) return r;
    return { ok: true, gistId: data.id, htmlUrl: data.html_url };
  } catch (e) {
    return { ok: false, error: 'Error de red: ' + (e.message || String(e)) };
  }
}

function persistWarband(wb) {
  if (!wb) return;
  wb.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY + ':' + wb.id, JSON.stringify(wb));
  // Update index
  const idx = loadIndex();
  const existing = idx.findIndex(x => x.id === wb.id);
  const entry = {
    id: wb.id, name: wb.name || '(Sin nombre)',
    factionId: wb.factionId, models: wb.models.length,
    updatedAt: wb.updatedAt,
  };
  if (existing >= 0) idx[existing] = entry;
  else idx.push(entry);
  saveIndex(idx);
  // Auto-save current pointer
  localStorage.setItem(STORAGE_KEY + ':current', wb.id);
}

function loadWarband(id) {
  const raw = localStorage.getItem(STORAGE_KEY + ':' + id);
  if (!raw) return null;
  try {
    const wb = JSON.parse(raw);
    migrateWarband(wb);
    return wb;
  } catch { return null; }
}

/**
 * Migrate older warband objects to the current schema. Currently:
 *   - Backfill `id` field on advancements/scars from name → CAMPAIGN_TABLES
 *     so older saved bands get mechanical effects when their preset names
 *     match a known advancement.
 *   - (Phase 2) Backfill freeBattles, discoveredLocations and campaignIds
 *     for bands saved before the free-progression refactor. These fields
 *     default to empty arrays. The migration is idempotent — if the
 *     arrays already exist they are not touched.
 */
function migrateWarband(wb) {
  if (!wb) return;
  // Phase 2 backfill: ensure the free-progression arrays exist. Older
  // saves don't have these fields; assigning an empty array preserves
  // the warband's history (no free battles played yet) without losing
  // any data. This runs every time loadWarband is called, but it's
  // idempotent because we only create the arrays when missing.
  if (!Array.isArray(wb.freeBattles)) wb.freeBattles = [];
  if (!Array.isArray(wb.discoveredLocations)) wb.discoveredLocations = [];
  if (!Array.isArray(wb.campaignIds)) wb.campaignIds = [];
  // Fase 6.1 backfill — shopping list. Idempotent: only created when
  // absent, so existing entries from a previous session are preserved.
  if (!Array.isArray(wb.shoppingList)) wb.shoppingList = [];
  // Fase 5.6 backfill — Arsenal pool.
  if (!Array.isArray(wb.arsenal)) wb.arsenal = [];
  // Fase 5.7 backfill — temporary bonuses.
  if (!Array.isArray(wb.tempBonuses)) wb.tempBonuses = [];
  // Fase 11 PIVOT v2 backfill — experimentalVariants.
  if (!Array.isArray(wb.experimentalVariants)) wb.experimentalVariants = [];
  // Patron backfill — null hasta que se asigne (canon p.86-93).
  if (typeof wb.patronId === 'undefined') wb.patronId = null;
  // SPEC-rediseno-ui Sub-H backfill — shoppingList items.scope.
  // Items legacy sin scope: forModel definido → 'unit', sin forModel → 'pool'.
  // Idempotente: si ya hay scope válido, no se toca.
  if (Array.isArray(wb.shoppingList)) {
    for (const it of wb.shoppingList) {
      if (it && (it.scope !== 'pool' && it.scope !== 'unit')) {
        it.scope = it.forModel ? 'unit' : 'pool';
      }
      if (it && (typeof it.quantity !== 'number' || it.quantity < 1)) {
        it.quantity = 1;
      }
    }
  }
  // BACKLOG P1/3 backfill — strongbox. Zeroed baseline; existing
  // freeBattles don't retroactively populate it (would risk
  // double-counting after manual edits). A retro-fill helper can be
  // added later if the user wants to backfill explicitly.
  if (!wb.strongbox || typeof wb.strongbox !== 'object') {
    wb.strongbox = { ducados: 0, glory: 0 };
  } else {
    if (typeof wb.strongbox.ducados !== 'number') wb.strongbox.ducados = 0;
    if (typeof wb.strongbox.glory   !== 'number') wb.strongbox.glory   = 0;
  }

  if (!wb.models) return;
  for (const m of wb.models) {
    const bp = m.baseProgression;
    if (!bp) continue;
    if (Array.isArray(bp.advancements)) {
      for (const adv of bp.advancements) {
        if (!adv.id && adv.name) {
          const def = CAMPAIGN_TABLES.advancements.find(a => a.name === adv.name);
          if (def && def.id !== 'custom') adv.id = def.id;
        }
      }
    }
    if (Array.isArray(bp.scars)) {
      for (const scar of bp.scars) {
        if (!scar.id && scar.name) {
          const def = CAMPAIGN_TABLES.statDownOptions.find(s => s.name === scar.name);
          if (def) scar.id = def.id;
        }
      }
    }
  }
}

function loadCurrent() {
  const id = localStorage.getItem(STORAGE_KEY + ':current');
  if (id) return loadWarband(id);
  return null;
}

function deleteWarband(id) {
  localStorage.removeItem(STORAGE_KEY + ':' + id);
  const idx = loadIndex().filter(x => x.id !== id);
  saveIndex(idx);
  markDeleted('warbands', id);
  if (typeof _fbScheduleAutoSave === 'function') _fbScheduleAutoSave();
}

/* ====================================================================
   FREE BATTLES — data model (Phase 2)

   A free battle ('partida libre') is a single-game record that lives
   inside the warband object, not in any campaign. The progression
   unit is the warband: it gains XP, ducats, glory and discoveries
   from both campaign battles AND free battles, with the same canon
   rules applied uniformly.

   Schema for a free battle entry:
     id          : 'fb_<timestamp36>'
     origin      : 'free'                    // distinguishes from campaign
     name        : optional player-supplied name (default: auto-generated)
     opponent    : free-form string ('Marcos\'s Heretics')
     scenarioId  : matches DATA.scenarios[i].id
     dicePicked  : Exploration dice override (1-10, default 3)
     result      : 'win' | 'loss' | 'draw' | null   (player marks at end)
     timestamp   : ISO date when the battle started
     completedAt : ISO when the post-battle assistant finished
     loot        : ducats earned from Exploration loot
     glory       : glory points earned this battle
     xpAwarded   : { modelUid: xpDelta, ... } for traceability
     traumaResults: [{ modelUid, roll, outcome }]
     discoveries : array of "table:roll" keys discovered this battle
     gloriousDeeds: list of {deedId, modelUid, count} mirroring battle tracker
     notes       : free-form player notes
   ==================================================================== */

/**
 * Create a fresh free battle record. The caller passes the player-set
 * fields (name, opponent, scenario, dicePicked); the function fills in
 * defaults for everything else and stamps a unique id.
 */
function createFreeBattle(opts) {
  opts = opts || {};
  const ts = new Date().toISOString();
  // Auto-generated name when the player didn't provide one. Format:
  // 'Libre · 8 may · vs Heretic Legions de Marcos'. Short enough to
  // fit a list view, descriptive enough to be useful in history.
  let name = opts.name && String(opts.name).trim();
  if (!name) {
    const d = new Date(ts);
    const dayLabel = d.getDate() + ' ' + ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()];
    const opp = opts.opponent ? ' · vs ' + opts.opponent : '';
    name = 'Libre · ' + dayLabel + opp;
  }
  return {
    id: 'fb_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    origin: 'free',
    name,
    opponent: opts.opponent || '',
    scenarioId: opts.scenarioId || null,
    dicePicked: typeof opts.dicePicked === 'number' ? opts.dicePicked : 3,
    result: null,            // player marks W/L/D after battle
    timestamp: ts,
    completedAt: null,
    loot: 0,
    glory: 0,
    xpAwarded: {},
    traumaResults: [],
    discoveries: [],
    gloriousDeeds: [],
    notes: '',
  };
}

/**
 * Append a free battle to the warband and persist. We delegate to
 * persistWarband so the same path that handles other warband mutations
 * also handles free battles — no separate index, no separate storage key.
 */
function addFreeBattle(wb, fb, opts) {
  if (!wb) return;
  if (!Array.isArray(wb.freeBattles)) wb.freeBattles = [];
  wb.freeBattles.push(fb);
  // BACKLOG P1/3 — fold the battle's loot/glory into the warband's
  // central strongbox so the QM "Lista" can spend in free context.
  // opts.skipStrongboxCredit: the wizard QM step already credited the
  // income (so the player could spend it during the battle wizard) —
  // skip here to avoid double-counting.
  if (!wb.strongbox || typeof wb.strongbox !== 'object') wb.strongbox = { ducados: 0, glory: 0 };
  if (!(opts && opts.skipStrongboxCredit)) {
    if (fb && typeof fb.loot  === 'number') wb.strongbox.ducados += fb.loot;
    if (fb && typeof fb.glory === 'number') wb.strongbox.glory   += fb.glory;
  }
  if (typeof persistWarband === 'function') {
    persistWarband(wb);
  }
}

/**
 * Total number of battles this warband has played, summing free battles
 * and battles from every campaign the warband participates in. Used by
 * the Exploration engine when running in free-battle context — the
 * narrative interpretation is "the warband has accumulated experience
 * exploring through all its games, irrespective of which formal
 * tournament it was part of".
 *
 * In contrast, campaign battles for Exploration purposes count only the
 * battles in that specific campaign — see getEffectiveGameNumber below.
 */
/* ─── Fase 11 PIVOT v2 — Variantes experimentales + Shopping list helpers
 *
 * El sandbox bifurca configuraciones sin tocar la banda canon. La canon
 * sigue siendo lo que TC dice; las variantes son overrides locales que
 * Forge gestiona en wb.experimentalVariants[]. Pueden compararse en Lab
 * y promoverse items a shoppingList.
 *
 * Schema Variant:
 *   { id, name, createdAt, description?, overrides: [...] }
 *
 * Schema ShoppingItem:
 *   { id, type, name, description?, createdAt, source, variantId?, forModel?, checked }
 *   type: 'equipment' | 'model'
 *   source: 'manual' | 'variant'
 */

function _idGen(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function createVariant(wb, name) {
  if (!wb || typeof wb !== 'object') return null;
  if (!Array.isArray(wb.experimentalVariants)) wb.experimentalVariants = [];
  const v = {
    id: _idGen('var'),
    name: name || 'Variante ' + (wb.experimentalVariants.length + 1),
    description: '',
    createdAt: Date.now(),
    overrides: [],
  };
  wb.experimentalVariants.push(v);
  return v;
}

function getVariant(wb, id) {
  if (!wb || !Array.isArray(wb.experimentalVariants) || !id) return null;
  return wb.experimentalVariants.find(v => v.id === id) || null;
}

function removeVariant(wb, id) {
  if (!wb || !Array.isArray(wb.experimentalVariants)) return false;
  const i = wb.experimentalVariants.findIndex(v => v.id === id);
  if (i < 0) return false;
  wb.experimentalVariants.splice(i, 1);
  return true;
}

function addShoppingItem(wb, partial) {
  if (!wb || typeof wb !== 'object') return null;
  if (!Array.isArray(wb.shoppingList)) wb.shoppingList = [];
  const p = partial || {};
  // SPEC-rediseno-ui Sub-H — scope explícito. Si no se pasa, lo
  // deducimos: forModel definido → 'unit', sino → 'pool'.
  let scope = p.scope;
  if (scope !== 'pool' && scope !== 'unit') {
    scope = p.forModel ? 'unit' : 'pool';
  }
  const item = {
    id: _idGen('sl'),
    type: p.type || 'equipment',
    name: p.name || '',
    description: p.description || '',
    cost: (typeof p.cost === 'number') ? p.cost : null,
    category: p.category || null,
    scope: scope,
    quantity: (typeof p.quantity === 'number' && p.quantity > 0) ? p.quantity : 1,
    createdAt: Date.now(),
    source: p.source || 'manual',
    variantId: p.variantId || null,
    forModel: p.forModel || null,
    notes: p.notes || '',
    checked: false,
  };
  wb.shoppingList.push(item);
  return item;
}

function removeShoppingItem(wb, id) {
  if (!wb || !Array.isArray(wb.shoppingList)) return false;
  const i = wb.shoppingList.findIndex(it => it.id === id);
  if (i < 0) return false;
  wb.shoppingList.splice(i, 1);
  return true;
}

function toggleShoppingItemChecked(wb, id) {
  if (!wb || !Array.isArray(wb.shoppingList)) return false;
  const it = wb.shoppingList.find(x => x.id === id);
  if (!it) return false;
  it.checked = !it.checked;
  return true;
}

/**
 * Fase 13-A PIVOT v2 — Agrupación de items para vista UI.
 * Returns { manual:[], byVariant:{[variantId]:[items]}, historico:[] }
 *
 * Decisión 1 doc: items con checked=true van a sección "Histórico"
 * (separada visualmente, plegable). NO se borran salvo "Limpiar tachados".
 */
function groupShoppingItems(wb) {
  const out = { manual: [], byVariant: {}, historico: [] };
  if (!wb || !Array.isArray(wb.shoppingList)) return out;
  for (const it of wb.shoppingList) {
    if (it.checked) { out.historico.push(it); continue; }
    if (it.source === 'variant' && it.variantId) {
      if (!out.byVariant[it.variantId]) out.byVariant[it.variantId] = [];
      out.byVariant[it.variantId].push(it);
    } else {
      out.manual.push(it);
    }
  }
  return out;
}

/**
 * Borra todos los items con checked=true. Devuelve count borrados.
 */
function clearCheckedShoppingItems(wb) {
  if (!wb || !Array.isArray(wb.shoppingList)) return 0;
  const before = wb.shoppingList.length;
  wb.shoppingList = wb.shoppingList.filter(it => !it.checked);
  return before - wb.shoppingList.length;
}

/**
 * Fase 14-A PIVOT v2 — Badge fuente de banda.
 * Diferencia visual entre banda sincronizada con Trench Companion
 * (autoridad oficial) y banda local creada con "Nueva Manual" (no oficial).
 */
function warbandSourceBadgeHtml(wb) {
  if (!wb) return '';
  if (wb.companionSource) {
    const wbId = wb.companionSource['warband-id'] || '?';
    return '<span class="wb-source-badge wb-source-tc" title="Banda sincronizada con Trench Companion · warband-id: ' +
      wbId + '">🔗 TC sync</span>';
  }
  return '<span class="wb-source-badge wb-source-local" title="Banda local creada en Forge — no oficial">💾 Local</span>';
}

/**
 * Aplica los overrides de una variante experimental a un clon profundo
 * de la banda. La banda canon NUNCA se muta — sandbox principle.
 *
 * Override types:
 *   { type:'replace-equipment', modelUid, oldKitId, newKitId }
 *   { type:'add-equipment',     modelUid, kitId }
 *   { type:'remove-equipment',  modelUid, kitId }
 *   { type:'add-model',         model: {uid, name, unitId, battlekit, upgrades, ...} }
 *   { type:'remove-model',      modelUid }
 *
 * Si variantId no existe, devuelve el clon sin modificaciones (vista canon).
 */
function applyVariantOverrides(wb, variantId) {
  if (!wb || typeof wb !== 'object') return wb;
  const clone = JSON.parse(JSON.stringify(wb));
  const v = getVariant(wb, variantId);
  if (!v || !Array.isArray(v.overrides)) return clone;
  for (const ov of v.overrides) {
    if (!ov || !ov.type) continue;
    const findModel = (uid) => clone.models.find(m => m.uid === uid);
    switch (ov.type) {
      case 'replace-equipment': {
        const m = findModel(ov.modelUid);
        if (!m || !Array.isArray(m.battlekit)) break;
        const i = m.battlekit.indexOf(ov.oldKitId);
        if (i >= 0) m.battlekit[i] = ov.newKitId;
        else m.battlekit.push(ov.newKitId);
        break;
      }
      case 'add-equipment': {
        const m = findModel(ov.modelUid);
        if (!m) break;
        if (!Array.isArray(m.battlekit)) m.battlekit = [];
        if (!m.battlekit.includes(ov.kitId)) m.battlekit.push(ov.kitId);
        break;
      }
      case 'remove-equipment': {
        const m = findModel(ov.modelUid);
        if (!m || !Array.isArray(m.battlekit)) break;
        m.battlekit = m.battlekit.filter(k => k !== ov.kitId);
        break;
      }
      case 'add-model': {
        if (ov.model && typeof ov.model === 'object') {
          clone.models.push(JSON.parse(JSON.stringify(ov.model)));
        }
        break;
      }
      case 'remove-model': {
        clone.models = clone.models.filter(m => m.uid !== ov.modelUid);
        break;
      }
    }
  }
  return clone;
}

/**
 * Calcula resumen de cambios variante vs canon.
 * Returns { added: [...], removed: [...], replaced: [...] }
 * Cada entrada describe brevemente el cambio para UI/promoción.
 */
function getVariantDiff(wb, variantId) {
  const empty = { added: [], removed: [], replaced: [] };
  if (!wb) return empty;
  const v = getVariant(wb, variantId);
  if (!v || !Array.isArray(v.overrides)) return empty;
  const out = { added: [], removed: [], replaced: [] };
  for (const ov of v.overrides) {
    switch (ov.type) {
      case 'add-equipment':
        out.added.push({ kind:'equipment', modelUid: ov.modelUid, name: ov.kitId });
        break;
      case 'remove-equipment':
        out.removed.push({ kind:'equipment', modelUid: ov.modelUid, name: ov.kitId });
        break;
      case 'replace-equipment':
        out.replaced.push({ kind:'equipment', modelUid: ov.modelUid,
                            from: ov.oldKitId, to: ov.newKitId });
        break;
      case 'add-model':
        out.added.push({ kind:'model', uid: ov.model && ov.model.uid,
                         name: (ov.model && (ov.model.name || ov.model.unitId)) || 'modelo' });
        break;
      case 'remove-model':
        out.removed.push({ kind:'model', modelUid: ov.modelUid });
        break;
    }
  }
  return out;
}

/**
 * Promueve los items NUEVOS de una variante a la lista de la compra.
 * Lo "removido" no se descuenta (Marcos sigue teniendo el item viejo
 * pintado en la peana). Lo "reemplazado" añade el nuevo, no descuenta
 * el viejo (canon doc Fase 12).
 *
 * Cada item promovido marca source='variant' + variantId para trazar
 * origen. Devuelve array de items añadidos.
 */
function promoteVariantToShoppingList(wb, variantId) {
  if (!wb) return [];
  const v = getVariant(wb, variantId);
  if (!v || !Array.isArray(v.overrides)) return [];
  const added = [];
  for (const ov of v.overrides) {
    if (ov.type === 'add-equipment') {
      const item = addShoppingItem(wb, {
        type: 'equipment', name: ov.kitId,
        source: 'variant', variantId: v.id, forModel: ov.modelUid,
      });
      if (item) added.push(item);
    } else if (ov.type === 'replace-equipment') {
      const item = addShoppingItem(wb, {
        type: 'equipment', name: ov.newKitId,
        source: 'variant', variantId: v.id, forModel: ov.modelUid,
        description: 'Reemplaza ' + ov.oldKitId,
      });
      if (item) added.push(item);
    } else if (ov.type === 'add-model') {
      const m = ov.model || {};
      const item = addShoppingItem(wb, {
        type: 'model', name: m.name || m.unitId || 'modelo nuevo',
        source: 'variant', variantId: v.id,
      });
      if (item) added.push(item);
    }
  }
  return added;
}

/* Sub-Fase 12-D PIVOT v2 — Integración Lab variante vs canon.
 *
 * Aplica overrides de variante a un clon profundo + invoca runCompare_lab
 * contra una lista de enemigos canon. La banda canon NO muta.
 *
 * Default enemyIds = los 6 arquetipos clásicos del Lab cuando no se
 * pasa nada (mejor "panorama general" automático).
 *
 * Returns { ok:true, result:{ resultsA, resultsB, comparison[] } }
 *   o     { ok:false, error:string }
 */
const _DEFAULT_LAB_ENEMY_IDS = [
  'newAntioch','trenchPilgrims','ironSultanate',
  'hereticLegions','blackGrail','courtSerpent',
];

function compareVariantVsCanon(wb, variantId, enemyIds, opts) {
  if (!wb || typeof wb !== 'object') {
    return { ok: false, error: 'Banda no cargada.' };
  }
  const v = getVariant(wb, variantId);
  if (!v) {
    return { ok: false, error: 'Variante no encontrada: ' + variantId };
  }
  if (typeof runCompare_lab !== 'function') {
    return { ok: false, error: 'Motor Lab no disponible (runCompare_lab).' };
  }
  const enemies = (Array.isArray(enemyIds) && enemyIds.length > 0)
    ? enemyIds : _DEFAULT_LAB_ENEMY_IDS;
  // Snapshot canon antes (paranoia: el motor no debería mutar pero
  // verificamos por contrato).
  const variantClone = applyVariantOverrides(wb, variantId);
  let result;
  try {
    result = runCompare_lab(wb, variantClone, enemies, opts || {});
  } catch (e) {
    return { ok: false, error: 'Error en simulación: ' + (e.message || String(e)) };
  }
  return { ok: true, result };
}

function getTotalBattleCount(wb) {
  if (!wb) return 0;
  let total = (wb.freeBattles && wb.freeBattles.length) || 0;
  if (Array.isArray(wb.campaignIds) && typeof loadCampaign === 'function') {
    for (const cid of wb.campaignIds) {
      const c = loadCampaign(cid);
      if (!c || !Array.isArray(c.battles)) continue;
      // Count only the battles where THIS warband participated.
      for (const b of c.battles) {
        if (b.warbandId === wb.id) total++;
      }
    }
  }
  return total;
}

/**
 * Effective number of games for Exploration calculations, given a
 * battle context. The context object is one of:
 *   { type: 'free' }
 *   { type: 'campaign', campaignId: '<cid>' }
 *
 * Free battles use total battle count (canon-loose extension: the
 * warband has been around). Campaign battles use the strict canon:
 * games played in that specific campaign so far. This matches the
 * rulebook's "the number of games you have played in the campaign".
 */
function getEffectiveGameNumber(wb, ctx) {
  if (!wb) return 0;
  ctx = ctx || { type: 'free' };
  if (ctx.type === 'free') {
    return getTotalBattleCount(wb);
  }
  if (ctx.type === 'campaign' && ctx.campaignId) {
    if (typeof loadCampaign !== 'function') return 0;
    const c = loadCampaign(ctx.campaignId);
    if (!c || !Array.isArray(c.battles)) return 0;
    let n = 0;
    for (const b of c.battles) {
      if (b.warbandId === wb.id) n++;
    }
    return n;
  }
  return 0;
}


