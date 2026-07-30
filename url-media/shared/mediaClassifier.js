/**
 * Media classification: given a URL and optional content-type, decide
 * whether it looks like a media/streaming resource worth capturing.
 */
import { MEDIA_TYPES } from './constants.js';

function getExtension(pathname) {
  const match = /\.([a-z0-9]{2,5})(?:$)/i.exec(pathname.split('?')[0].split('#')[0]);
  return match ? match[1].toLowerCase() : '';
}

/**
 * @param {string} url
 * @param {string} [contentType]
 * @returns {{type:string,isSegment:boolean}|null}
 */
export function classifyMedia(url, contentType = '') {
  if (!url) return null;

  if (url.startsWith('blob:')) {
    return { type: MEDIA_TYPES.BLOB, isSegment: false };
  }

  if (!/^https?:\/\//i.test(url)) {
    // ignore data:, chrome-extension:, about:, etc.
    return null;
  }

  let pathname = '';
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }

  const ext = getExtension(pathname);
  const ct = (contentType || '').toLowerCase();

  // console.log(ct);
  // --- Playlists / manifests -------------------------------------------
  if (ext === 'm3u8' || ct.includes('mpegurl')) {
    return { type: MEDIA_TYPES.HLS, isSegment: false };
  }
  if ( ct.includes('text/vtt')) {
    return { type: MEDIA_TYPES.VTT, isSegment: false };
  }
  if (ext === 'mpd' || ct.includes('dash+xml')) {
    return { type: MEDIA_TYPES.DASH, isSegment: false };
  }

  // --- Segments (gated behind captureSegments option) -------------------
  if (ext === 'ts' || ct === 'video/mp2t') {
    return { type: MEDIA_TYPES.TS, isSegment: true };
  }
  if (ext === 'm4s' || ct.includes('m4s')) {
    return { type: MEDIA_TYPES.M4S, isSegment: true };
  }

  // --- Direct video/audio files ------------------------------------------
  if (ext === 'mp4' || ct.startsWith('video/mp4')) {
    return { type: MEDIA_TYPES.MP4, isSegment: false };
  }
  if (ext === 'webm' || ct.startsWith('video/webm')) {
    return { type: MEDIA_TYPES.WEBM, isSegment: false };
  }
  if (['mp3', 'aac', 'm4a', 'wav', 'ogg', 'flac', 'weba'].includes(ext) || ct.startsWith('audio/')) {
    return { type: MEDIA_TYPES.AUDIO, isSegment: false };
  }
  if (['mov', 'mkv', 'avi', 'm4v', '3gp', 'ogv'].includes(ext) || ct.startsWith('video/')) {
    return { type: MEDIA_TYPES.VIDEO, isSegment: false };
  }

  return null;
}
