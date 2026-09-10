import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, APP_VERSION } from './config';

const WALLET_KEY = 'solzero.wallet';
const REPORT_TIMEOUT_MS = 5000;

function normalizeError(err) {
  if (!err) return { message: 'unknown error', stack: '' };
  if (typeof err === 'string') return { message: err, stack: '' };
  return {
    message: String((err && err.message) || err),
    stack: String((err && err.stack) || '')
  };
}

/**
 * 上报客户端错误到后端。设计为 fire-and-forget：
 * 任何环节失败都不会再抛错，避免影响主流程。
 */
export async function reportError(context, err) {
  try {
    const norm = normalizeError(err);
    if (!norm.message) return;

    let wallet = null;
    try {
      wallet = await AsyncStorage.getItem(WALLET_KEY);
    } catch (storageErr) {
      wallet = null;
    }

    const payload = {
      context: String(context || 'app').slice(0, 64),
      message: norm.message.slice(0, 2000),
      stack: norm.stack.slice(0, 5000),
      wallet: typeof wallet === 'string' && wallet ? wallet : null,
      appVersion: APP_VERSION,
      platform: `${Platform.OS} ${Platform.Version || ''}`.trim()
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);
    try {
      await fetch(`${API_URL}/api/errors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (ignore) {
    // 上报失败不影响业务
  }
}

/**
 * 捕获 React Native 全局未处理异常。
 */
export function initGlobalErrorHandler() {
  try {
    if (!global.ErrorUtils || !global.ErrorUtils.setGlobalHandler) return;
    const previous = global.ErrorUtils.getGlobalHandler
      ? global.ErrorUtils.getGlobalHandler()
      : null;
    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
      reportError('unhandled', error);
      if (previous) previous(error, isFatal);
    });
  } catch (err) {
    // 忽略
  }
}
