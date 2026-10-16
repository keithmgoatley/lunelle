/**
 * Field-level encryption for everything written to SQLite.
 *
 * Expo Go cannot load SQLCipher, so instead every row payload is encrypted
 * with AES-256-GCM (authenticated encryption) in JavaScript via @noble/ciphers.
 * The 256-bit key is generated on first launch from the OS secure RNG and kept
 * in the iOS Keychain through expo-secure-store; it never leaves the device.
 */
import { gcm } from '@noble/ciphers/aes.js';
import * as SecureStore from 'expo-secure-store';
import { getRandomBytes } from 'expo-crypto';

const KEY_NAME = 'lunelle.dbkey.v1';
let key: Uint8Array | null = null;

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string) => {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
};

/**
 * JSON with all non-ASCII escaped as \uXXXX, so a byte is a char and we do
 * not depend on TextEncoder/TextDecoder availability in Hermes.
 */
function asciiJson(value: unknown): string {
  return JSON.stringify(value).replace(/[\u0080-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}
const strToBytes = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const bytesToStr = (b: Uint8Array) => {
  let s = '';
  for (let i = 0; i < b.length; i += 4096) s += String.fromCharCode(...b.subarray(i, i + 4096));
  return s;
};

/** Loads the key from the Keychain, creating it on first run. */
export async function initKey(): Promise<void> {
  const existing = await SecureStore.getItemAsync(KEY_NAME);
  if (existing) {
    key = fromHex(existing);
    return;
  }
  const fresh = getRandomBytes(32);
  await SecureStore.setItemAsync(KEY_NAME, toHex(fresh), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  key = fresh;
}

export async function destroyKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_NAME);
  key = null;
}

/** Returns hex(nonce || ciphertext+tag). */
export function encrypt(value: unknown): string {
  if (!key) throw new Error('Encryption key not initialised');
  const nonce = getRandomBytes(12);
  const ct = gcm(key, nonce).encrypt(strToBytes(asciiJson(value)));
  return toHex(nonce) + toHex(ct);
}

export function decrypt<T>(hex: string): T {
  if (!key) throw new Error('Encryption key not initialised');
  const bytes = fromHex(hex);
  const pt = gcm(key, bytes.subarray(0, 12)).decrypt(bytes.subarray(12));
  return JSON.parse(bytesToStr(pt)) as T;
}
