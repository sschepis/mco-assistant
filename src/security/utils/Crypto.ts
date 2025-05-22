/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

export async function encrypt(data: any, publicKey: string): Promise<any> {
  return Promise.resolve('encrypted data');
}

export async function decrypt(data: any, privateKey: string): Promise<any> {
  return Promise.resolve('decrypted data');
}