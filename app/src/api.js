import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';
import { reportError } from './errors';

const TOKEN_KEY = 'solzero.token';
const WALLET_KEY = 'solzero.wallet';

export async function getStoredToken() {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (err) {
    return null;
  }
}

export async function storeToken(token) {
  if (token) {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, String(token));
    } catch (err) {
      /* non-fatal */
    }
  }
}

export async function clearStoredToken() {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    /* non-fatal */
  }
}

export async function getStoredWallet() {
  try {
    return await AsyncStorage.getItem(WALLET_KEY);
  } catch (err) {
    return null;
  }
}

export async function storeWallet(wallet) {
  if (wallet) {
    try {
      await AsyncStorage.setItem(WALLET_KEY, String(wallet));
    } catch (err) {
      /* non-fatal */
    }
  }
}

export async function clearStoredWallet() {
  try {
    await AsyncStorage.removeItem(WALLET_KEY);
  } catch (err) {
    /* non-fatal */
  }
}

export async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (opts.auth !== false) {
    const token = await getStoredToken();
    if (token) headers.Authorization = 'Bearer ' + token;
  }
  let res;
  try {
    res = await fetch(API_URL + '/api' + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
  } catch (err) {
    reportError('api.network', err);
    throw err;
  }
  let json = null;
  try {
    json = await res.json();
  } catch (err) {
    json = null;
  }
  if (!res.ok) {
    const message = (json && json.error) || 'HTTP ' + res.status;
    const error = new Error(message);
    error.status = res.status;
    if (res.status >= 500) reportError('api.' + String(path).replace(/^\/+/, '').replace(/\//g, '.'), error);
    throw error;
  }
  return json;
}

export async function getSolPrice() {
  try {
    const r = await api('/price', { auth: false });
    return r.solUsd;
  } catch (err) {
    return null;
  }
}
