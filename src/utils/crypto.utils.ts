
import sha256 from 'crypto-js/sha256';
import hmacSHA512 from 'crypto-js/hmac-sha512';
import Base64 from 'crypto-js/enc-base64';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { buffer } from 'stream/consumers';

dotenv.config();

const algorithm = 'aes-256-cbc';
const secretKey = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, 'hex');
// const iv = crypto.randomBytes(16);

export function encrypt(text: string): string {
    if (!text) throw new Error('암호화할 텍스트가 없습니다.');

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey,iv);
    let encrypted = cipher.update(text,'utf8','hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex')+':'+encrypted;
}


export function decrypt(encryptedText : string): string{
    if (!encryptedText) throw new Error('복호화할 텍스트가 없습니다.');

    const[ivHex, encryted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex,'hex');
    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    let decrypted = decipher.update(encryted,'hex','utf8');
    decrypted += decipher.final('utf8');
    return decrypted.toString();

}


