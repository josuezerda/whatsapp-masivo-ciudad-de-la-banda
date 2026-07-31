/**
 * modules/auth.js
 * Autenticación con Supabase
 * Municipalidad de Ciudad de La Banda
 */

// Supabase config (solo clave pública/anon — segura para frontend)
const SUPABASE_URL  = 'https://ydidkocoidguxqehjenn.supabase.co';
const SUPABASE_ANON = 'sb_publishable_BdjdWdNGlfi7uj2ZAQpPEA_f2yTcvum';

const Auth = (() => {

  let _client  = null;
  let _session = null;
  let _user    = null;

  // ── INICIALIZAR SUPABASE ──────────────────────
  function init() {
    if (!window.supabase) {
      console.error('Supabase SDK no cargado');
      return false;
    }
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

    // Escuchar cambios de sesión
    _client.auth.onAuthStateChange((event, session) => {
      _session = session;
      _user    = session?.user ?? null;

      if (event === 'SIGNED_OUT') {
        goToLogin();
      }
      if (event === 'SIGNED_IN') {
        goToDashboard();
      }
    });

    return true;
  }

  // ── LOGIN ─────────────────────────────────────
  async function signIn(email, password) {
    if (!_client) init();
    const { data, error } = await _client.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    _session = data.session;
    _user    = data.user;
    return { ok: true, user: data.user };
  }

  // ── LOGOUT ────────────────────────────────────
  async function signOut() {
    if (!_client) return;
    await _client.auth.signOut();
    _session = null;
    _user    = null;
  }

  // ── VERIFICAR SESIÓN ──────────────────────────
  async function getSession() {
    if (!_client) init();
    const { data } = await _client.auth.getSession();
    _session = data.session;
    _user    = data.session?.user ?? null;
    return _session;
  }

  // ── PROTEGER PÁGINA ───────────────────────────
  // Llamar al inicio de index.html — redirige si no hay sesión
  async function requireAuth() {
    if (!_client) init();
    const session = await getSession();
    if (!session) {
      goToLogin();
      return false;
    }
    return true;
  }

  // ── PROTEGER LOGIN ────────────────────────────
  // Llamar al inicio de login.html — redirige si ya hay sesión
  async function requireGuest() {
    if (!_client) init();
    const session = await getSession();
    if (session) {
      goToDashboard();
      return false;
    }
    return true;
  }

  // ── GETTERS ───────────────────────────────────
  function getUser() { return _user; }
  function isLoggedIn() { return !!_session; }
  function getDisplayName() {
    return _user?.user_metadata?.nombre || _user?.email?.split('@')[0] || 'Administrador';
  }
  function getEmail() { return _user?.email || ''; }

  // ── NAVEGACIÓN ────────────────────────────────
  function goToLogin() {
    if (!window.location.pathname.endsWith('login.html')) {
      window.location.href = 'login.html';
    }
  }
  function goToDashboard() {
    if (!window.location.pathname.endsWith('index.html') &&
        !window.location.pathname.endsWith('/')) {
      window.location.href = 'index.html';
    }
  }

  // Inicializar automáticamente
  init();

  return {
    init, signIn, signOut,
    getSession, requireAuth, requireGuest,
    getUser, getEmail, getDisplayName, isLoggedIn,
  };
})();

export default Auth;
