import type { Page } from "@playwright/test";
import type { PrivateKeyAccount } from "viem/accounts";

export async function installInjectedWallet(
  page: Page,
  account: PrivateKeyAccount,
  chainId: number,
  options?: {
    activeChainId?: number;
    switchChainFails?: boolean;
  }
): Promise<void> {
  await page.exposeBinding(
    "__e2eSignMessage",
    async (_source, message: string) => account.signMessage({ message })
  );

  await page.addInitScript(
    ({ activeChainIdHex, chainIdHex, switchChainFails, walletAddress }) => {
      const signMessage = async (message: string) => {
        const signer = (window as unknown as Window & {
          __e2eSignMessage: (message: string) => Promise<string>;
        }).__e2eSignMessage;

        return signer(message);
      };
      let currentChainIdHex = activeChainIdHex;
      let transactionSequence = 0;

      (window as unknown as Window & {
        ethereum: {
          request: (input: { method: string; params?: unknown }) => Promise<unknown>;
        };
      }).ethereum = {
        request: async ({ method, params }) => {
          if (method === "eth_requestAccounts") {
            return [walletAddress];
          }

          if (method === "eth_accounts") {
            return [walletAddress];
          }

          if (method === "eth_chainId") {
            return currentChainIdHex;
          }

          if (method === "wallet_switchEthereumChain") {
            const [switchParams] = Array.isArray(params) ? params : [];

            if (
              !switchParams ||
              typeof switchParams !== "object" ||
              !("chainId" in switchParams) ||
              typeof switchParams.chainId !== "string"
            ) {
              throw new Error("Expected wallet_switchEthereumChain to receive a chainId.");
            }

            if (switchChainFails) {
              const error = new Error("Wallet rejected chain switch.") as Error & {
                code?: number;
              };
              error.code = 4001;
              throw error;
            }

            currentChainIdHex = switchParams.chainId;
            return null;
          }

          if (method === "eth_sendTransaction") {
            const [transaction] = Array.isArray(params) ? params : [];

            if (!transaction || typeof transaction !== "object") {
              throw new Error("Expected eth_sendTransaction to receive a transaction object.");
            }

            transactionSequence += 1;
            const hash = `0x${transactionSequence.toString(16).padStart(64, "0")}`;
            const walletWindow = window as unknown as Window & {
              __e2eSubmittedTransactions?: Array<Record<string, unknown>>;
            };
            walletWindow.__e2eSubmittedTransactions ??= [];
            walletWindow.__e2eSubmittedTransactions.push({
              hash,
              transaction
            });

            return hash;
          }

          if (method === "personal_sign") {
            const [message] = Array.isArray(params) ? params : [];

            if (typeof message !== "string") {
              throw new Error("Expected personal_sign to receive a message string.");
            }

            return signMessage(message);
          }

          throw new Error(`Unsupported wallet method: ${method}`);
        }
      };
    },
    {
      activeChainIdHex: `0x${(options?.activeChainId ?? chainId).toString(16)}`,
      chainIdHex: `0x${chainId.toString(16)}`,
      switchChainFails: options?.switchChainFails ?? false,
      walletAddress: account.address.toLowerCase()
    }
  );
}
