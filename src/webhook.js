// src/webhook.js
import fetch from 'node-fetch';
import FormData from 'form-data';
import { error, log } from './logging.js';

const DEFAULT_MAX_BYTES = Number(process.env.MAX_ATTACHMENT_BYTES) || 16 * 1024 * 1024; // 16MB

async function fetchBufferFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch asset ${url}: ${res.status}`);
  const buffer = await res.buffer();
  const length = Number(res.headers.get('content-length')) || buffer.length;
  return { buffer, length };
}

/**
 * Send webhook payload with optional attachments.
 * - webhookUrl: string
 * - payload: object (payload_json)
 * - attachments: [{ url, filename, contentType? }]
 *
 * Returns true on success, false on failure.
 */
export async function sendWebhook(webhookUrl, payload, attachments = []) {
  if (!webhookUrl) {
    error('Webhook URL is empty');
    return false;
  }

  try {
    // If no attachments, send JSON as before
    if (!attachments || attachments.length === 0) {
      const url = new URL(webhookUrl);
      // keep previous behavior: allow wait param if present in payload (optional)
      if (payload?.wait) url.searchParams.append('wait', 'true');

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Webhook error ${res.status}: ${body}`);
      }
      return true;
    }

    // Build multipart form-data
    const form = new FormData();
    form.append('payload_json', JSON.stringify(payload));

    // Fetch and append attachments as files[i]
    let fileIndex = 0;
    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i];
      if (!att || !att.url) continue;
      try {
        const { buffer, length } = await fetchBufferFromUrl(att.url);
        if (length > DEFAULT_MAX_BYTES) {
          log(`Attachment ${att.filename || att.url} too large (${length} bytes), skipping attachment.`);
          continue;
        }
        const name = att.filename || `file_${fileIndex}`;
        form.append(`files[${fileIndex}]`, buffer, { filename: name, contentType: att.contentType || 'application/octet-stream' });
        fileIndex++;
      } catch (err) {
        error(`Failed to fetch attachment ${att.url}: ${err.message}`);
        // continue without failing entire request
      }
    }

    const url = new URL(webhookUrl);
    // do not append wait param here by default; payload can include it if needed

    const res = await fetch(url.toString(), {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Webhook error ${res.status}: ${body}`);
    }

    return true;
  } catch (err) {
    error(`Failed to send webhook: ${err.message}`);
    return false;
  }
}

/**
 * Send error notice to ERROR_WEBHOOK (keeps previous behavior)
 */
export async function sendErrorNotice(message) {
  const { ERROR_WEBHOOK } = await import('./config.js');
  if (!ERROR_WEBHOOK) return;

  const payload = {
    username: 'Uh Oh :(((',
    content: `\`\`\`\n${message}\n\`\`\``,
  };

  await sendWebhook(ERROR_WEBHOOK, payload, []);
}
