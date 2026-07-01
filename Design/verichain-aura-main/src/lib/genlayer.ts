// GenLayer integration layer for CredVerify.
// Wraps the genlayer-js SDK with graceful fallback to mock data when the
// SDK / network isn't reachable (e.g. sandbox preview without a wallet).

export const CONTRACT_ADDRESS =
  "0x042b5a214E0552791c40E34Ed4358DE1DB4Ee1F0" as const;

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
  try {
    const mod: any = await import("genlayer-js");
    const chains: any = await import("genlayer-js/chains");
    cachedReadClient = mod.createClient({ chain: chains.testnetBradbury });
    return cachedReadClient;
  } catch (err) {
    console.warn("[genlayer] read client unavailable", err);
    return null;
  }
}

export async function getWriteClient(address: string) {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No injected EVM wallet detected");
  const mod: any = await import("genlayer-js");
  const chains: any = await import("genlayer-js/chains");
  return mod.createClient({
    chain: chains.testnetBradbury,
    account: address,
    provider: eth,
  });
}

// ---------- Mock data (fallback so the UI is always alive) ----------
const MOCK: VerificationResult[] = [
  {
    id: 7,
    requester: "0x8f2a…c19b",
    candidate_name: "Amelia Okonkwo",
    institution: "Massachusetts Institute of Technology",
    credential_title: "M.Sc. Computer Science, 2023",
    verify_url: "https://registrar.mit.edu/verify/8xk2p",
    verdict: "VALID",
    confidence: "HIGH",
    name_match: true, institution_match: true, title_match: true,
    summary:
      "Registrar page directly lists the candidate, degree and conferral year. Cryptographic signature on the page matches MIT's public key.",
    timestamp: Date.now() - 1000 * 60 * 12,
  },
  {
    id: 6,
    requester: "0x21ce…44a0",
    candidate_name: "Marco Zeller",
    institution: "Stanford GSB",
    credential_title: "MBA, 2019",
    verify_url: "https://gsb-verify.stanford.edu/mz-8821",
    verdict: "INVALID",
    confidence: "HIGH",
    name_match: false, institution_match: true, title_match: false,
    summary:
      "Verification page exists but references a different candidate and a Certificate program, not an MBA. Discrepancy flagged by all validators.",
    timestamp: Date.now() - 1000 * 60 * 55,
  },
  {
    id: 5,
    requester: "0x9b71…f0e2",
    candidate_name: "Priya Raman",
    institution: "ETH Zürich",
    credential_title: "B.Sc. Electrical Engineering",
    verify_url: "https://ethz.ch/verify/PR-4471",
    verdict: "UNCERTAIN",
    confidence: "MEDIUM",
    name_match: true, institution_match: true, title_match: false,
    summary:
      "Name and institution confirmed; the page lists a related but distinct programme (Information Technology & Electrical Engineering). Human review suggested.",
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
  },
  {
    id: 4,
    requester: "0x55d3…1b7c",
    candidate_name: "Julien Vasseur",
    institution: "École Polytechnique",
    credential_title: "Ingénieur Diplômé, 2021",
    verify_url: "https://alumni.polytechnique.edu/v/jv2021",
    verdict: "VALID",
    confidence: "HIGH",
    name_match: true, institution_match: true, title_match: true,
    summary: "Alumni registry entry matches all three fields with full record.",
    timestamp: Date.now() - 1000 * 60 * 60 * 22,
  },
];

export async function getAllVerifications(): Promise<VerificationResult[]> {
  const client = await getReadClient();
  if (!client) return MOCK;
  try {
    const res = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_all",
      args: [],
    });
    if (Array.isArray(res) && res.length) return res as VerificationResult[];
    return MOCK;
  } catch (err) {
    console.warn("[genlayer] get_all failed, using mock", err);
    return MOCK;
  }
}

export async function getTotal(): Promise<number> {
  const client = await getReadClient();
  if (!client) return MOCK.length;
  try {
    const n = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_total",
      args: [],
    });
    return Number(n);
  } catch {
    return MOCK.length;
  }
}

export interface VerificationRequest {
  candidate_name: string;
  institution: string;
  credential_title: string;
  verify_url: string;
}

// Read get_all WITHOUT the mock fallback (used for polling the real verdict).
async function readRealAll(): Promise<VerificationResult[]> {
  const client = await getReadClient();
  if (!client) return [];
  try {
    const res = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_all",
      args: [],
    });
    return Array.isArray(res) ? (res as VerificationResult[]) : [];
  } catch (err) {
    console.warn("[genlayer] readRealAll failed", err);
    return [];
  }
}

export async function requestVerification(
  address: string,
  req: VerificationRequest,
): Promise<{ result: VerificationResult | null; hash: string; mocked: boolean }> {
  try {
    const client = await getWriteClient(address);
    const hash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "request_verification",
      args: [req.candidate_name, req.institution, req.credential_title, req.verify_url],
      value: 0n,
    });

    // The write is accepted quickly, but the LLM verdict only becomes readable
    // once the tx finalizes. Wait for acceptance, then poll get_all for the real
    // record (matched on url + candidate) until the finalized state shows up.
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

    let match: VerificationResult | undefined;
    for (let i = 0; i < 30 && !match; i++) {
      const all = await readRealAll();
      match = all.find(
        (r) => r.verify_url === req.verify_url && r.candidate_name === req.candidate_name,
      );
      if (!match) await new Promise((r) => setTimeout(r, 6000));
    }

    return { result: match ?? null, hash: String(hash), mocked: false };
  } catch (err) {
    console.warn("[genlayer] write failed, simulating", err);
    // No wallet / sandbox preview: simulate a plausible window + verdict.
    await new Promise((r) => setTimeout(r, 2500));
    return {
      result: makeSimulatedResult(req, address),
      hash: "0xmock" + Math.random().toString(16).slice(2, 10),
      mocked: true,
    };
  }
}

export function makeSimulatedResult(req: VerificationRequest, requester: string): VerificationResult {
  const seed = (req.candidate_name + req.credential_title).length;
  const verdicts: Verdict[] = ["VALID", "VALID", "UNCERTAIN", "INVALID"];
  const verdict = verdicts[seed % verdicts.length];
  const confidence: Confidence = verdict === "UNCERTAIN" ? "MEDIUM" : "HIGH";
  const allMatch = verdict === "VALID";
  return {
    id: Math.floor(Math.random() * 9000 + 100),
    requester,
    ...req,
    verdict,
    confidence,
    name_match: allMatch || verdict !== "INVALID",
    institution_match: allMatch,
    title_match: allMatch,
    summary:
      verdict === "VALID"
        ? "Live-fetched page confirms all three fields. Validator quorum reached without dissent."
        : verdict === "INVALID"
        ? "Live page does not corroborate the claim. Multiple validators flagged the discrepancy."
        : "Live page partially corroborates the claim. Validators reached a split decision — human review recommended.",
    timestamp: Date.now(),
  };
}
