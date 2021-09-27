import { Command, flags } from "@oclif/command";
import { Config } from "../../service/config";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { build, resolveRecipient } from "../../service/cryptid";
import * as Flags from "../../lib/flags";

export default class TokenTransfer extends Command {
  static description = "Send SPL-Tokens to a recipient";

  static flags = {
    ...Flags.common,
    mint: flags.build<PublicKey>({
      char: "m",
      description: "The SPL-Token mint(base58)",
      required: true,
      parse: (address: string): PublicKey => new PublicKey(address),
    })(),
    allowUnfundedRecipient: flags.boolean({
      char: 'f',
      description: 'Create a token account for the recipient if needed',
      default: false
    })
  };

  static args = [
    {
      name: "to",
      description: "Recipient alias, did or public key (base58)",
      required: true,
    },
    {
      name: "amount",
      description: "The amount in lamports to transfer",
      required: true,
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = this.parse(TokenTransfer);

    const config = new Config(flags.config);
    const cryptid = build(config);
    const address = await cryptid.address();

    const to = await resolveRecipient(args.to, config);
    this.log(`${args.to} resolved to ${to}`);
    this.log('mint: ' + flags.mint!.toBase58())

    const { blockhash: recentBlockhash } =
      await config.connection.getRecentBlockhash();

    const senderAssociatedTokenAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      flags.mint as PublicKey,
      address,
      true
    );
    const recipientAssociatedTokenAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      flags.mint as PublicKey,
      to,
      true
    );

    const instructions = [];

    if (flags.allowUnfundedRecipient) {
      // check if the recipient ATA exists:
      const recipientATAAccount = await config.connection.getAccountInfo(recipientAssociatedTokenAccount);

      if (!recipientATAAccount) {
        this.log("Creating a token account for " + to)
        const createATAInstruction = Token.createAssociatedTokenAccountInstruction(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          flags.mint as PublicKey,
          recipientAssociatedTokenAccount,
          to,
          address
        )

        instructions.push(createATAInstruction)
      }
    }

    const transferInstruction = Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      senderAssociatedTokenAccount,
      recipientAssociatedTokenAccount,
      address,
      [],
      args.amount
    );
    instructions.push(transferInstruction)

    const tx = new Transaction({
      recentBlockhash,
      feePayer: address//config.keypair.publicKey,
    }).add(...instructions);

    const [signedTx] = await cryptid.sign(tx);
    console.log(
      signedTx.signatures.map((s) => ({
        publicKey: s.publicKey.toString(),
        signature: s.signature,
      }))
    );
    console.log(
      signedTx.instructions[0].keys.map((k) => ({
        ...k,
        pubkey: k.pubkey.toString(),
      }))
    );
    const txSignature = await config.connection.sendRawTransaction(
      signedTx.serialize()
    );

    this.log(
      `Transaction sent: https://explorer.identity.com/tx/${txSignature}`
    );
  }
}
