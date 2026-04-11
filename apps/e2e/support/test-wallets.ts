import { privateKeyToAccount } from "viem/accounts";

export const customerPrivateKey =
  "0x59c6995e998f97a5a0044966f094538e0f2f5b4f34c9d8f4c584108a52d69f8f" as const;
export const operatorPrivateKey =
  "0x8b3a350cf5c34c9194ca1a9c2666e7282f7f1d2f0ac6e0d70906cbab768c1328" as const;

export const testWallets = {
  customer: privateKeyToAccount(customerPrivateKey),
  operator: privateKeyToAccount(operatorPrivateKey)
} as const;
