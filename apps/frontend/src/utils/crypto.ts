// Simple encryption utilities using Web Crypto API
// Uses AES-GCM with a key derived from the room code

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Derive a crypto key from room code
async function deriveKey(roomCode: string): Promise<CryptoKey> {
    const keyData = encoder.encode(roomCode.padEnd(32, '0').slice(0, 32));
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        keyData.buffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
    return keyMaterial;
}

// Generate a random IV
function generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(12));
}

// Encrypt a message
export async function encryptMessage(message: string, roomCode: string): Promise<string> {
    try {
        const key = await deriveKey(roomCode);
        const iv = generateIV();
        const messageData = encoder.encode(message);

        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
            key,
            messageData.buffer
        );

        // Combine IV + encrypted data and encode as base64
        const encryptedArray = new Uint8Array(encrypted);
        const combined = new Uint8Array(iv.length + encryptedArray.length);
        combined.set(iv);
        combined.set(encryptedArray, iv.length);

        return btoa(String.fromCharCode(...combined));
    } catch (e) {
        console.error('Encryption failed:', e);
        return message; // Fallback to plain text
    }
}

// Decrypt a message
export async function decryptMessage(encryptedMessage: string, roomCode: string): Promise<string> {
    try {
        const key = await deriveKey(roomCode);
        const combined = new Uint8Array(
            atob(encryptedMessage).split('').map(c => c.charCodeAt(0))
        );

        const iv = combined.slice(0, 12);
        const data = combined.slice(12);

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
            key,
            data.buffer
        );

        return decoder.decode(decrypted);
    } catch (e) {
        console.error('Decryption failed:', e);
        return '[Encrypted Message]'; // Fallback
    }
}
