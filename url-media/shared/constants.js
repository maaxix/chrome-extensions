/**
 * Shared constants for Media URL Capturer.
 * Keep this file dependency-free (no imports) so it can be used
 * from the service worker, popup, and side panel alike.
 */

export const STORAGE_LOCAL_KEYS = {
  SETTINGS: 'muc_settings'
};

export const STORAGE_SESSION_KEYS = {
  TABS_DATA: 'muc_tabs_data'
};

export const DEFAULT_SETTINGS = {
  globalEnabled: true,      // master ON/OFF switch
  captureSegments: false,   // capture .ts / .m4s segment requests (off by default, very noisy)
  clearOnNavigate: true,    // clear a tab's captured list on top-level navigation
  maxItemsPerTab: 1500      // safety cap to bound memory / session storage usage
};

export const MEDIA_TYPES = {
  HLS: 'hls',
  DASH: 'dash',
  MP4: 'mp4',
  WEBM: 'webm',
  M4S: 'm4s',
  TS: 'ts',
  AUDIO: 'audio',
  VIDEO: 'video',
  BLOB: 'blob',
  VTT: 'vtt',
  OTHER: 'other'
};

export const MEDIA_TYPE_LABELS = {
  [MEDIA_TYPES.HLS]: 'HLS Playlist (.m3u8)',
  [MEDIA_TYPES.DASH]: 'DASH Manifest (.mpd)',
  [MEDIA_TYPES.MP4]: 'MP4 Video',
  [MEDIA_TYPES.WEBM]: 'WebM Video',
  [MEDIA_TYPES.M4S]: 'Fragmented MP4 Segment (.m4s)',
  [MEDIA_TYPES.TS]: 'TS Segment (.ts)',
  [MEDIA_TYPES.AUDIO]: 'Audio',
  [MEDIA_TYPES.VIDEO]: 'Video',
  [MEDIA_TYPES.BLOB]: 'Blob URL (in-page)',
  [MEDIA_TYPES.VTT]: 'subtitle',
  [MEDIA_TYPES.OTHER]: 'Other Media'
};

// Types considered "segments" — noisy, repeated requests, gated by captureSegments.
export const SEGMENT_TYPES = new Set([MEDIA_TYPES.TS, MEDIA_TYPES.M4S]);

// Playlist/manifest types — always the most useful entries.
export const PLAYLIST_TYPES = new Set([MEDIA_TYPES.HLS, MEDIA_TYPES.DASH]);

export const MESSAGE_TYPES = {
  GET_STATE: 'GET_STATE',
  SET_GLOBAL_ENABLED: 'SET_GLOBAL_ENABLED',
  SET_TAB_ENABLED: 'SET_TAB_ENABLED',
  SET_CAPTURE_SEGMENTS: 'SET_CAPTURE_SEGMENTS',
  SET_CLEAR_ON_NAVIGATE: 'SET_CLEAR_ON_NAVIGATE',
  GET_CAPTURED: 'GET_CAPTURED',
  CLEAR_CAPTURED: 'CLEAR_CAPTURED',
  CONTENT_MEDIA_FOUND: 'CONTENT_MEDIA_FOUND',
  CAPTURE_UPDATED: 'CAPTURE_UPDATED',
  OPEN_SIDE_PANEL: 'OPEN_SIDE_PANEL',
  LIST_TABS: 'LIST_TABS'
};
