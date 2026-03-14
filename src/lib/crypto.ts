/**
 * AES-256-GCM end-to-end encryption for chat messages.
 * Key is derived from the chatId using PBKDF2 — both the finder and admin
 * know the chatId (it's in the URL), so both can decrypt.
 * Firestore only ever stores an opaque base64 blob.
 */

const SALT = "ghostqr-e2e-salt-v1";
const ITERATIONS = 100_000;

async function deriveKey(chatId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(chatId),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(SALT),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypt a plaintext string → base64 ciphertext (IV prepended) */
export async function encryptMessage(text: string, chatId: string): Promise<string> {
  const key = await deriveKey(chatId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));

  // Pack: 12-byte IV || ciphertext → base64
  const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt a base64 ciphertext → plaintext string */
export async function decryptMessage(b64: string, chatId: string): Promise<string> {
  try {
    const key = await deriveKey(chatId);
    const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const cipher = combined.slice(12);

    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return new TextDecoder().decode(plain);
  } catch {
    // If decryption fails (e.g. old unencrypted message), return as-is
    return b64;
  }
}
