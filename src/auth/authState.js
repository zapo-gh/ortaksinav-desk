/**
 * Auth State - Tauri masaüstü uygulaması
 * Yerel SQLite kullanıcı sistemi. Firebase tamamen kaldırıldı.
 */
import {
  login as localLogin,
  logout as localLogout,
  register as localRegister,
  getCurrentSession,
} from '../services/localAuth';

const listeners = new Set();

/** Session'ı ExamContext'in beklediği Firebase-benzeri formata dönüştür */
function sessionToAuthUser(session) {
  if (!session) return null;
  return {
    uid: session.id,
    email: session.username,
    displayName: session.displayName,
    isAnonymous: false,
  };
}

function notifyListeners(session) {
  const authUser = sessionToAuthUser(session);
  listeners.forEach(cb => { try { cb(authUser); } catch (e) { /* listener error */ } });
}

export const waitForAuth = async () => getCurrentSession();

export const getCurrentUser = () => getCurrentSession();

export const getCurrentUserId = () => getCurrentSession()?.id ?? null;

export const getUserRole = async () => {
  const session = getCurrentSession();
  return session ? 'admin' : 'public';
};

export const clearCachedRole = () => {};

export const subscribeToAuthChanges = (callback) => {
  if (typeof callback !== 'function') return () => {};
  listeners.add(callback);
  // Mevcut oturumu hemen bildir (uid içeren formatta)
  Promise.resolve().then(() => callback(sessionToAuthUser(getCurrentSession())));
  return () => listeners.delete(callback);
};

export const signInWithEmail = async (username, password, rememberMe = false) => {
  const session = await localLogin(username, password, rememberMe);
  notifyListeners(session);
  return session;
};

export const signOutUser = () => {
  localLogout();
  notifyListeners(null);
};

export const notifyAuthListeners = (session) => {
  notifyListeners(session);
};

// Kayıt (yeni kullanıcı oluştur)
export const registerUser = async (username, password, displayName) => {
  const session = await localRegister(username, password, displayName);
  notifyListeners(session);
  return session;
};

export const signIn = signInWithEmail;
export const signOut = signOutUser;
