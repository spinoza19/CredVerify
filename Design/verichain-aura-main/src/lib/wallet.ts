import { BRADBURY } from "./genlayer";

export function short(addr: string) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export async function connectWallet(): Promise<string> {
  const eth = (window as any).ethereum;
  if (!eth) {
    throw new Error("No EVM wallet found. Install MetaMask to connect.");
  }
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  if (!accounts?.[0]) throw new Error("No account returned from the wallet.");
  await ensureBradbury();
  return accounts[0];
}

export async function ensureBradbury() {
  const eth = (window as any).ethereum;
  if (!eth) return;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BRADBURY.chainIdHex }],
    });
  } catch (err: any) {
    if (err?.code === 4902 || /Unrecognized chain/i.test(err?.message ?? "")) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: BRADBURY.chainIdHex,
          chainName: BRADBURY.chainName,
          rpcUrls: BRADBURY.rpcUrls,
          blockExplorerUrls: BRADBURY.blockExplorerUrls,
          nativeCurrency: BRADBURY.nativeCurrency,
        }],
      });
    }
  }
}
