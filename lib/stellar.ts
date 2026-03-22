/// <reference types="node" />

import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";

/**
 * Signs a Stellar transaction XDR string using the private key
 * stored in environment variables.
 */
export const signTransaction = (
  txXDR: string,
  networkPassphrase: string
): string => {
  const secretKey = process.env.STELLAR_PRIVATE_KEY;

  if (!secretKey) {
    throw new Error("Missing STELLAR_PRIVATE_KEY in environment variables");
  }

  if (!txXDR) {
    throw new Error("txXDR parameter is required");
  }

  if (!networkPassphrase) {
    throw new Error("networkPassphrase parameter is required");
  }

  const keypair = Keypair.fromSecret(secretKey);
  const transaction = TransactionBuilder.fromXDR(
    txXDR,
    networkPassphrase
  );

  transaction.sign(keypair);

  return transaction.toXDR();
};
