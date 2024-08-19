// wallet.js
export class Wallet {
  constructor() {
    this.privateKey = null;
    this.publicKey = null;
    this.publicKeyPEM = null;
  }

  async generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign", "verify"]
    );

    this.privateKey = keyPair.privateKey;
    this.publicKey = keyPair.publicKey;

    // Convert public key to PEM format
    const exported = await window.crypto.subtle.exportKey(
      "spki",
      this.publicKey
    );
    const exportedAsString = String.fromCharCode.apply(
      null,
      new Uint8Array(exported)
    );
    this.publicKeyPEM = `-----BEGIN PUBLIC KEY-----\n${btoa(
      exportedAsString
    )}\n-----END PUBLIC KEY-----`;
  }

  async sign(transaction) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(transaction));
    const signature = await window.crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      this.privateKey,
      data
    );
    return btoa(String.fromCharCode.apply(null, new Uint8Array(signature)));
  }
}
