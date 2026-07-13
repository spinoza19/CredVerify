// GenLayer integration layer for CredVerify.
//
// Production verification runs ONLY against the live contract. There is no mock
// or simulated verdict in the real flow: a failed chain call surfaces an error,
// never a fabricated "verified" result.

export const CONTRACT_ADDRESS =
  "0x233b8d90A546e0e57934345d2939bb931eEAC9f1" as const;

export const BRADBURY = {
  chainIdHex: "0x107d",
  chainId: 4221,
  chainName: "GenLayer Bradbury Testnet",
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  blockExplorerUrls: ["https://explorer-bradbury.genlayer.com/"],
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
};

export type Verdict = "VALID" | "INVALID" | "UNCERTAIN";
export type Confidence = "LOW" | "MEDIUM" | "HIGH";

export interface VerificationResult {
  id: string | number;
  requester: string;
  candidate_name: string;
  institution: string;
  credential_title: string;
  verify_url: string;
  issuer_domain: string;
  domain_authoritative: boolean;
  verdict: Verdict;
  confidence: Confidence;
  name_match: boolean;
  institution_match: boolean;
  title_match: boolean;
  summary: string;
  timestamp?: number;
}

let cachedReadClient: any = null;
async function getReadClient() {
  if (cachedReadClient) return cachedReadClient;
  const mod: any = await import("genlayer-js");
  const chains: any = await import("genlayer-js/chains");
  cachedReadClient = mod.createClient({ chain: chains.testnetBradbury });
  return cachedReadClient;
}

export async function getWriteClient(address: string) {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No injected EVM wallet detected. Install MetaMask to continue.");
  const mod: any = await import("genlayer-js");
  const chains: any = await import("genlayer-js/chains");
  return mod.createClient({
    chain: chains.testnetBradbury,
    account: address,
    provider: eth,
  });
}

// Read every verification straight from the contract. Returns [] on failure —
// never mock data, so an empty or unreachable ledger reads as empty, not "verified".
export async function getAllVerifications(): Promise<VerificationResult[]> {
  try {
    const client = await getReadClient();
    const res = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_all",
      args: [],
    });
    const list = Array.isArray(res) ? (res as VerificationResult[]) : [];
    return list.slice().reverse(); // newest first
  } catch (err) {
    console.error("[genlayer] get_all failed", err);
    return [];
  }
}

export async function getTotal(): Promise<number> {
  try {
    const client = await getReadClient();
    const n = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_total",
      args: [],
    });
    return Number(n);
  } catch {
    return 0;
  }
}

export interface VerificationRequest {
  candidate_name: string;
  institution: string;
  credential_title: string;
  verify_url: string;
}

// Submit a real on-chain verification. Throws if there is no wallet or the
// transaction fails — the caller must surface that, not substitute a result.
// `result` is the finalized on-chain verdict, or null if the tx was accepted
// but the verdict hasn't finalized yet (the caller shows a pending state).
export async function requestVerification(
  address: string,
  req: VerificationRequest,
): Promise<{ result: VerificationResult | null; hash: string }> {
  const client = await getWriteClient(address);
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "request_verification",
    args: [req.candidate_name, req.institution, req.credential_title, req.verify_url],
    value: 0n,
  });

  try {
    await client.waitForTransactionReceipt?.({
      hash,
      status: "ACCEPTED",
      interval: 6000,
      retries: 30,
    });
  } catch (e) {
    console.warn("[genlayer] receipt wait ended early", e);
  }

  // Poll get_all for the finalized record (matched on url + candidate).
  let match: VerificationResult | undefined;
  for (let i = 0; i < 30 && !match; i++) {
    const all = await getAllVerifications();
    match = all.find(
      (r) => r.verify_url === req.verify_url && r.candidate_name === req.candidate_name,
    );
    if (!match) await new Promise((r) => setTimeout(r, 6000));
  }

  return { result: match ?? null, hash: String(hash) };
}
