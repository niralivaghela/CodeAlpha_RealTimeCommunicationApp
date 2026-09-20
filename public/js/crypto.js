/**
 * Web Crypto API AES-GCM 256-Bit End-to-End Encryption (E2EE) Module
 */

const AppCrypto = {
  // Derive AES-GCM Key using PBKDF2
  async deriveKey(passphrase, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  // Encrypt text string into Base64 ciphertext, IV, and Salt
  async encryptText(text, passphrase) {
    try {
      const enc = new TextEncoder();
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const key = await this.deriveKey(passphrase, salt);

      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        enc.encode(text)
      );

      return {
        ciphertext: this.bufToBase64(encryptedBuffer),
        iv: this.bufToBase64(iv),
        salt: this.bufToBase64(salt)
      };
    } catch (err) {
      console.error('Encryption failed:', err);
      throw err;
    }
  },

  // Decrypt Base64 payload using passphrase
  async decryptText(payload, passphrase) {
    try {
      const dec = new TextDecoder();
      const ciphertext = this.base64ToBuf(payload.ciphertext);
      const iv = this.base64ToBuf(payload.iv);
      const salt = this.base64ToBuf(payload.salt);

      const key = await this.deriveKey(passphrase, salt);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
      );

      return dec.decode(decryptedBuffer);
    } catch (err) {
      console.error('Decryption failed:', err);
      return '[Decryption Error: Secret key mismatch]';
    }
  },

  // Utilities
  bufToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  },

  base64ToBuf(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
};

window.AppCrypto = AppCrypto;
