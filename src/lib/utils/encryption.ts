let DERIVED_KEY: Uint8Array<ArrayBuffer> | null = null;
function getEncryptionKey(): Uint8Array<ArrayBuffer> {
  if (DERIVED_KEY) return DERIVED_KEY;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY environment variable is required in production");
    }
    console.warn("ENCRYPTION_KEY not set — using dev default (INSECURE, do not use in production)");
  }
  const key = raw || "socratopia-dev-enc-key-change-me";
  const bytes = new TextEncoder().encode(key);
  if (bytes.length < 32) throw new Error("ENCRYPTION_KEY must be at least 32 bytes (ASCII)");
  DERIVED_KEY = bytes.slice(0, 32) as Uint8Array<ArrayBuffer>;
  return DERIVED_KEY;
}

export async function encrypt(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = getEncryptionKey();
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(text);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return Buffer.from(combined).toString("base64");
}

export async function decrypt(encryptedText: string): Promise<string> {
  const decoder = new TextDecoder();
  const keyData = getEncryptionKey();
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["decrypt"]);
  const combined = Buffer.from(encryptedText, "base64");
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return decoder.decode(decrypted);
}
