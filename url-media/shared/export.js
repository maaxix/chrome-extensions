import { MEDIA_TYPE_LABELS } from './constants.js';

function fmtTime(ts) {
  try {
    return new Date(ts).toISOString().replace('T', ' ').replace('Z', '');
  } catch {
    return String(ts);
  }
}

/**
 * Build a human-readable, grep-friendly plain text export.
 * @param {Array} items - captured entries { url, type, method, source, statusCode, timestamp, tabTitle? }
 * @param {{scopeLabel?: string}} opts
 */
export function buildExportText(items, opts = {}) {
  const lines = [];
  lines.push('# Media URL Capturer — export');
  lines.push(`# Scope: ${opts.scopeLabel || 'All tabs'}`);
  lines.push(`# Generated: ${fmtTime(Date.now())}`);
  lines.push(`# Total URLs: ${items.length}`);
  lines.push('#');
  lines.push('# ---------------------------------------------------------------');
  lines.push('');

  const sorted = [...items].sort((a, b) => a.timestamp - b.timestamp);

  for (const it of sorted) {
    const label = MEDIA_TYPE_LABELS[it.type] || it.type;
    const meta = [
      `type=${label}`,
      it.method ? `method=${it.method}` : null,
      it.statusCode != null ? `status=${it.statusCode}` : null,
      it.source ? `source=${it.source}` : null,
      it.tabTitle ? `tab="${it.tabTitle}"` : null,
      `time=${fmtTime(it.timestamp)}`
    ].filter(Boolean).join(' | ');

    lines.push(`# ${meta}`);
    lines.push(it.url);
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
