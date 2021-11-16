import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { deriveDOASigner, deriveTransactionAccount } from '../util';
import { DOA_PROGRAM_ID, SOL_DID_PROGRAM_ID } from '../../constants';
import { Signer } from '../../../types/crypto';
import { CryptidInstruction } from './instruction';
import { any } from 'ramda';
import { InstructionData } from '../model/InstructionData';

export async function create(
  transaction: Transaction,
  didPDAKey: PublicKey,
  funder: 'cryptid' | PublicKey,
  cryptidAccount: PublicKey,
  accountSeed: string,
  signers: [Signer, AccountMeta[]][],
  accountSize?: number
): Promise<TransactionInstruction[]> {
  const transactionAccount = await deriveTransactionAccount(
    cryptidAccount,
    accountSeed
  );

  const keys: AccountMeta[] = [
    {
      pubkey:
        funder === 'cryptid'
          ? await deriveDOASigner(cryptidAccount).then(([key]) => key)
          : funder,
      isSigner: funder !== 'cryptid',
      isWritable: true,
    },
    { pubkey: transactionAccount, isSigner: false, isWritable: false },
    { pubkey: cryptidAccount, isSigner: false, isWritable: false },
    { pubkey: didPDAKey, isSigner: false, isWritable: false },
    { pubkey: SOL_DID_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ...signers.flatMap(([signer, extras]) => [
      { pubkey: signer.publicKey, isSigner: true, isWritable: false },
      ...extras,
    ]),
  ];

  const accountsArray: PublicKey[] = [];
  for (const instruction of transaction.instructions) {
    if (!any((key) => key.equals(instruction.programId), accountsArray)) {
      accountsArray.push(instruction.programId);
    }
    for (const instructionKey of instruction.keys) {
      if (!any((key) => key.equals(instructionKey.pubkey), accountsArray)) {
        accountsArray.push(instructionKey.pubkey);
      }
    }
  }

  const instructions: InstructionData[] = transaction.instructions.map(
    (instruction) =>
      InstructionData.fromTransactionInstruction(instruction, accountsArray)
  );

  const data: Buffer = CryptidInstruction.proposeTransaction(
    signers.map((signer) => ({
      signerExtras: signer[1].length,
      expireTime: BigInt(0),
    })),
    accountSize
      ? accountSize
      : calculateAccountSize(
          accountsArray.length,
          instructions.map((instruction) => ({
            accounts: instruction.accounts.length,
            dataLength: instruction.data.length,
          })),
          signers.map((signer) => signer[1].length)
        ),
    accountsArray,
    instructions,
    true,
    accountSeed
  ).encode();

  return [
    new TransactionInstruction({
      keys,
      programId: DOA_PROGRAM_ID,
      data,
    }),
  ];
}

function calculateAccountSize(
  numAccounts: number,
  instructionSizes: { accounts: number; dataLength: number }[],
  signersExtras: number[]
): number {
  return (
    1 + // Discriminant
    32 + //cryptid_account
    4 +
    32 * numAccounts + //accounts
    4 +
    instructionSizes
      .map((size) => {
        return (
          1 + //program_id
          4 +
          2 * size.accounts + //accounts
          4 +
          size.dataLength
        ); //data
      })
      .reduce((x, y) => x + y) +
    4 +
    signersExtras
      .map((signerExtra) => 32 + 4 + 32 * signerExtra + 8)
      .reduce((x, y) => x + y) + //signers
    1 + //state
    2
  ); //settings_sequence
}
