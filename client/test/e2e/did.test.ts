import { build } from '../../src';
import { Connection, Keypair } from '@solana/web3.js';
import { publicKeyToDid } from '../../src/lib/util';
import { airdrop } from '../utils/solana';
import { DecentralizedIdentifier } from '@identity.com/sol-did-client';

describe('DID operations', function () {
  this.timeout(20_000);
  let connection: Connection;

  let key: Keypair;
  let did: string;

  before(async () => {
    connection = new Connection('http://localhost:8899');
    key = Keypair.generate();
    did = publicKeyToDid(key.publicKey, 'localnet');

    await airdrop(connection, key.publicKey);
  });

  context('with a generative DID', () => {
    context('update', () => {
      it('should register the DID and add a key', async () => {
        const cryptid = await build(did, key, {
          connection,
          waitForConfirmation: true,
        });

        const newKey = Keypair.generate().publicKey;
        const alias = 'key2';

        const txSignature = await cryptid.addKey(newKey, alias);

        console.log('txSignature', txSignature);

        const document = await cryptid.document();

        const pda = await DecentralizedIdentifier.parse(did).pdaSolanaPubkey();

        console.log(pda.toBase58());

        console.log(document);
        // expect(document)
      });
    });
  });
});
