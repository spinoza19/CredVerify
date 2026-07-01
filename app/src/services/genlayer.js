// EVM wallet adapter for GenLayer Bradbury testnet.
//
// GenLayer accounts are plain EVM accounts, so we connect through an
// EIP-1193 provider (MetaMask / any injected wallet) and let it sign.
//   - readClient : talks straight to the GenLayer RPC, no wallet needed.
//   - writeClient: created after connection, signs via `window.ethereum`.

import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const CHAIN = testnetBradbury;

// Bradbury chain id 4221 == 0x107d
export const BRADBURY_CHAIN_ID_HEX = "0x107d";

export const BRADBURY_PARAMS = {
  chainId: BRADBURY_CHAIN_ID_HEX,
  chainName: "GenLayer Bradbury Testnet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  blockExplorerUrls: ["https://explorer-bradbury.genlayer.com/"],
};

// Read-only client (no signer required).
export const readClient = createClient({ chain: CHAIN });

function getInjectedProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error(
      "No EVM wallet found. Please install MetaMask to connect."
    );
  }
  return window.ethereum;
}

// Make sure the wallet is pointed at the Bradbury network; add it if missing.
async function ensureBradburyNetwork(provider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BRADBURY_CHAIN_ID_HEX }],
    });
  } catch (err) {
    // 4902 = chain not added yet in the wallet.
    if (err && (err.code === 4902 || err.code === -32603)) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [BRADBURY_PARAMS],
      });
    } else {
      throw err;
    }
  }
}

// Connect the wallet and return { address, writeClient }.
export async function connectWallet() {
  const provider = getInjectedProvider();
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  const address = accounts?.[0];
  if (!address) throw new Error("No address returned from the wallet.");

  await ensureBradburyNetwork(provider);

  const writeClient = createClient({
    chain: CHAIN,
    account: address,
    provider,
  });

  return { address, writeClient };
}

// Re-read the currently authorized account without prompting (for auto-reconnect).
export async function getConnectedAddress() {
  if (typeof window === "undefined" || !window.ethereum) return null;
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts?.[0] ?? null;
}

export function makeWriteClient(address) {
  return createClient({
    chain: CHAIN,
    account: address,
    provider: getInjectedProvider(),
  });
}

export function onWalletEvents({ onAccountsChanged, onChainChanged }) {
  if (typeof window === "undefined" || !window.ethereum) return;
  if (onAccountsChanged) window.ethereum.on("accountsChanged", onAccountsChanged);
  if (onChainChanged) window.ethereum.on("chainChanged", onChainChanged);
}
