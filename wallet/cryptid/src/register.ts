import type { WalletsWindow } from '@wallet-standard/base';
import { CryptidWallet } from './wallet.js';
import type { Cryptid } from './window.js';

declare const window: WalletsWindow;

export function register(cryptid: Cryptid): void {
    try {
        (window.navigator.wallets ||= []).push(({ register }) => register(new CryptidWallet(cryptid)));
    } catch (error) {
        console.error(error);
    }
}
