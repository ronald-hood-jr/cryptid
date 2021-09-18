import { publicKeyToDid } from '../../src/lib/util';
import { Keypair } from '@solana/web3.js';

export const makeKeypair = (): Keypair => Keypair.generate();
export const did = (keypair: Keypair = makeKeypair()): string =>
  publicKeyToDid(keypair.publicKey);
