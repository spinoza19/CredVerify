// Contract wrapper for the CredVerify intelligent contract.
// Reads go through the shared readClient; writes go through the
// wallet-backed write client (set once the user connects MetaMask).

import { readClient } from "../services/genlayer";

// genlayer-js returns dict/object results as JS Map instances (and nested
// Maps). This recursively turns them into plain objects/arrays.
function normalize(value) {
  if (value instanceof Map) {
    const obj = {};
    for (const [k, v] of value.entries()) obj[k] = normalize(v);
    return obj;
  }
  if (Array.isArray(value)) return value.map(normalize);
  return value;
}

export default class CredVerify {
  constructor(contractAddress) {
    this.contractAddress = contractAddress;
    this.writeClient = null;
  }

  setWriteClient(client) {
    this.writeClient = client;
  }

  async getAll() {
    const res = await readClient.readContract({
      address: this.contractAddress,
      functionName: "get_all",
      args: [],
    });
    const list = normalize(res) || [];
    // newest first
    return Array.isArray(list) ? list.slice().reverse() : [];
  }

  async getTotal() {
    const res = await readClient.readContract({
      address: this.contractAddress,
      functionName: "get_total",
      args: [],
    });
    return Number(res);
  }

  async requestVerification({ candidateName, institution, credentialTitle, verifyUrl }) {
    if (!this.writeClient) {
      throw new Error("Connect your wallet first (Connect Wallet).");
    }
    const txHash = await this.writeClient.writeContract({
      address: this.contractAddress,
      functionName: "request_verification",
      args: [candidateName, institution, credentialTitle, verifyUrl],
      value: 0n,
    });
    const receipt = await readClient.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED",
      interval: 8000,
      retries: 60,
    });
    return receipt;
  }
}
