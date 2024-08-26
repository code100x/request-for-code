import * as crypto from 'crypto';

class Transaction {
    fromAddress: string | null;
    toAddress: string;
    amount: number;
    signature: string | null;

    constructor(fromAddress: string | null, toAddress: string, amount: number, signature?: string) {
        this.fromAddress = fromAddress;
        this.toAddress  = toAddress;
        this.amount = amount;
        this.signature = signature ?? null;
    }

    calculateHash() {
        return crypto.createHash('sha256').update(this.fromAddress + this.toAddress + this.amount).digest('hex');
    }

    signTransaction(signingKey: crypto.KeyObject) {
        
        if (this.fromAddress === null) return; // Don't sign mining rewards 

        const hashTx = this.calculateHash();
        const sign = crypto.createSign('SHA256');
        sign.update(hashTx).end();
        this.signature = sign.sign(signingKey,'hex')
    }

    isValid(): boolean {
        console.log(this.fromAddress, "||" , this.fromAddress == null);
        if (this.fromAddress == null) return true; // Mining rewards don't need to be signed

        if(!this.signature || this.signature.length == 0) {
            return false;
        }
        const publicKey = crypto.createPublicKey(this.fromAddress);
        const verify = crypto.createVerify('SHA256');
        verify.update(this.calculateHash());
        return verify.verify(publicKey,this.signature,'hex');
    }

}

export default Transaction;