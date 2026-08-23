import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

const TOKEN_KEY = 'solzero.token';

export async function getStoredToken() {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (err) {
    return null;
  }
}

export async function storeToken(token) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearStoredToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (opts.auth !== false) {
    const token = await getStoredToken();
    if (token) headers.Authorization = 'Bearer ' + token;
  }
  const res = await fetch(API_URL + '/api' + path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
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