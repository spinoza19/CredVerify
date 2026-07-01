import { BRADBURY } from "./genlayer";

export function short(addr: string) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export async function connectWallet(): Promise<string> {
  const eth = (window as any).ethereum;
  if (!eth) {
    // Fake connect for preview when no wallet is installed
    const mock = "0x" + Math.random().toString(16).slice(2, 42).padEnd(40, "0");
    return mock;
  }
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
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
