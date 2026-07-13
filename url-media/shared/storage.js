/**
 * Thin wrapper around chrome.storage.local (persistent settings) and
 * chrome.storage.session (in-session captured data, cleared on browser exit).
 */
import { STORAGE_LOCAL_KEYS, STORAGE_SESSION_KEYS, DEFAULT_SETTINGS } from './constants.js';

export async function loadSettings() {
  const stored = await chrome.storage.local.get(STORAGE_LOCAL_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(stored[STORAGE_LOCAL_KEYS.SETTINGS] || {}) };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ [STORAGE_LOCAL_KEYS.SETTINGS]: settings });
}

export async function loadTabsData() {
  const stored = await chrome.storage.session.get(STORAGE_SESSION_KEYS.TABS_DATA);
  return stored[STORAGE_SESSION_KEYS.TABS_DATA] || {};
}

export async function saveTabsData(tabsData) {
  await chrome.storage.session.set({ [STORAGE_SESSION_KEYS.TABS_DATA]: tabsData });
}
