import { expect, test } from "../../fixtures/test";
import { installInjectedWallet } from "../../support/wallet-shim";
import { testWallets } from "../../support/test-wallets";

test("wallet shim supports account reads, chain switching, and transaction submission", async ({
  app,
  page
}) => {
  await installInjectedWallet(page, testWallets.customer, app.chainId, {
    activeChainId: 1
  });
  await page.goto("about:blank");

  const result = await page.evaluate(async (targetChainIdHex) => {
    const walletWindow = window as unknown as Window & {
      __e2eSubmittedTransactions?: Array<Record<string, unknown>>;
      ethereum: {
        request: (input: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
    };
    const accounts = (await walletWindow.ethereum.request({
      method: "eth_accounts"
    })) as string[];
    const chainBefore = (await walletWindow.ethereum.request({
      method: "eth_chainId"
    })) as string;

    await walletWindow.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainIdHex }]
    });

    const chainAfter = (await walletWindow.ethereum.request({
      method: "eth_chainId"
    })) as string;
    const hash = (await walletWindow.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: accounts[0],
          to: accounts[0],
          value: "0x0"
        }
      ]
    })) as string;

    return {
      accounts,
      chainAfter,
      chainBefore,
      hash,
      submittedCount: walletWindow.__e2eSubmittedTransactions?.length ?? 0
    };
  }, `0x${app.chainId.toString(16)}`);

  expect(result.accounts).toEqual([testWallets.customer.address.toLowerCase()]);
  expect(result.chainBefore).toBe("0x1");
  expect(result.chainAfter).toBe(`0x${app.chainId.toString(16)}`);
  expect(result.hash).toBe(
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  );
  expect(result.submittedCount).toBe(1);
});
