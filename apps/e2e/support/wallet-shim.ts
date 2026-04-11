import type { Page } from "@playwright/test";
import type { PrivateKeyAccount } from "viem/accounts";

export async function installInjectedWallet(
  page: Page,
  account: PrivateKeyAccount,
  chainId: number
): Promise<void> {
  await page.exposeBinding(
    "__e2eSignMessage",
    async (_source, message: string) => account.signMessage({ message })
  );

  await page.addInitScript(
    ({ chainIdHex, walletAddress }) => {
      const signMessage = async (message: string) => {
        const signer = (window as unknown as Window & {
          __e2eSignMessage: (message: string) => Promise<string>;
        }).__e2eSignMessage;

        return signer(message);
      };

      (window as unknown as Window & {
        ethereum: {
          request: (input: { method: string; params?: unknown }) => Promise<unknown>;
        };
      }).ethereum = {
        request: async ({ method, params }) => {
          if (method === "eth_requestAccounts") {
            return [walletAddress];
          }

          if (method === "eth_chainId") {
            return chainIdHex;
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
      chainIdHex: `0x${chainId.toString(16)}`,
      walletAddress: account.address.toLowerCase()
    }
  );
}
