<div align="center">

# CredVerify

### On-chain credential & diploma verification, powered by GenLayer

**CredVerify** is a decentralized dApp that verifies academic and professional credentials without a registrar, a central server, or a trusted middleman. A GenLayer **Intelligent Contract** fetches the credential's verification page **live from the open web**, adjudicates it with an **LLM**, reaches **validator consensus**, and stamps a public, tamper-evident verdict **on-chain**.

[![Network](https://img.shields.io/badge/GenLayer-Bradbury_Testnet-9AE600?style=flat-square)](https://explorer-bradbury.genlayer.com/)
[![Chain ID](https://img.shields.io/badge/Chain_ID-4221-8B5CF6?style=flat-square)](https://rpc-bradbury.genlayer.com)
[![Contract](https://img.shields.io/badge/Contract-0x233b…C9f1-1f2937?style=flat-square)](https://explorer-bradbury.genlayer.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](./LICENSE)

</div>

---

## The problem

Small recruiters, startups, and freelance agencies have no cheap, fast, and trustworthy way to verify a candidate's diploma or certificate. Manual verification takes days, forged PDFs are trivial to produce, and enterprise verification services are expensive and centralized.

## The solution

CredVerify turns verification into a single on-chain call. The Intelligent Contract:

1. **Fetches** the verification URL live from the web (no oracle, no backend).
2. **Adjudicates** with an LLM — does the page authentically confirm the claimed name, issuer, and credential title?
3. **Reaches consensus** — independent validators must agree on the verdict (GenLayer's *Optimistic Democracy*).
4. **Records** the result on-chain: a public, citable, tamper-evident verdict.

## Why GenLayer?

Ordinary smart contracts can't read the web or run an LLM, and a centralized API can be tampered with by whoever runs it. GenLayer's **Intelligent Contracts** combine live web access, LLM reasoning, and multi-validator consensus — enabling **trustless adjudication** of subjective claims, which is exactly what credential verification requires.

## Security & integrity

- **Issuer-domain binding.** Evidence is bound to authoritative sources. The contract extracts the host of every `verify_url` and, unless it belongs to a recognized issuer/platform domain or an academic TLD (`.edu`, `.ac.uk`, …), the verdict can **never** be `VALID` — it is deterministically capped at `UNCERTAIN`, independent of the LLM. A requester cannot get a page they control certified as a real credential. Each record stores `issuer_domain` and `domain_authoritative`.
- **No mock verdicts in the production flow.** The frontend performs **only** real on-chain reads and writes. A failed or unfinalized chain call surfaces an explicit error or a "pending" state — it is never substituted with a fabricated "verified" result.

---

## How it works

```
request_verification(candidate_name, institution, credential_title, verify_url)
        │
        ├─ gl.nondet.web.render(verify_url)        → pull the page live
        ├─ gl.nondet.exec_prompt(..., json)        → LLM verdict (constrained to
        │                                            enumerable values for consensus)
        ├─ gl.eq_principle.strict_eq(...)          → validators agree on the verdict
        └─ store Verification{ verdict, confidence, name/issuer/title match, summary }
```

Each verdict is one of `VALID` · `INVALID` · `UNCERTAIN`, with a `LOW` / `MEDIUM` / `HIGH` confidence and three match flags (name, issuer, title).

### Contract API

| Method | Type | Description |
| --- | --- | --- |
| `request_verification(candidate_name, institution, credential_title, verify_url)` | write | Runs a verification and stores the result |
| `get_all()` | view | Returns every verification record |
| `get_verification(request_id)` | view | Returns a single record |
| `get_total()` | view | Returns the number of verifications |

**Deployed on GenLayer Bradbury Testnet:** [`0x233b8d90A546e0e57934345d2939bb931eEAC9f1`](https://explorer-bradbury.genlayer.com/)

---

## Repository structure

```
credverify/
├── contracts/
│   └── credverify.py               # GenLayer Intelligent Contract (GenVM / Python)
├── app/                            # Original frontend — Vue 3 + Vite + Tailwind
├── Design/
│   └── verichain-aura-main/        # Primary frontend — React 19 + TanStack Start,
│                                   #   Tailwind v4, GSAP, genlayer-js, EVM wallet adapter
├── deploy/ · test/ · tools/        # Deployment script, tests, helpers
└── README.md
```

---

## Tech stack

- **Contract:** Python Intelligent Contract on GenVM (live web access + LLM + validator consensus)
- **Primary frontend:** React 19 · TanStack Start (SSR) · Tailwind CSS v4 · GSAP · TypeScript
- **Blockchain SDK:** [`genlayer-js`](https://www.npmjs.com/package/genlayer-js) with an EVM (MetaMask / EIP-1193) wallet adapter
- **Network:** GenLayer Bradbury Testnet — chain ID `4221`, RPC `https://rpc-bradbury.genlayer.com`

---

## Getting started

### Prerequisites

- **Node.js ≥ 20.19 or ≥ 22.12** (required by Vite 8)
- An EVM wallet (e.g. MetaMask) with a little GEN from the Bradbury faucet
- [GenLayer CLI](https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-cli) for contract work: `npm i -g genlayer`

### Run the frontend

```bash
cd Design/verichain-aura-main
npm install
npm run dev            # http://localhost:8080
```

The contract address is baked into `src/lib/genlayer.ts`, so the app connects to the live contract out of the box. Without a wallet the UI runs in a simulated preview mode; with MetaMask connected it performs real on-chain verifications.

### Deploy the contract (optional)

```bash
genlayer account import --private-key <KEY> --name me
genlayer account use me
genlayer network set testnet-bradbury
genlayer deploy --contract contracts/credverify.py

genlayer write <CONTRACT_ADDRESS> request_verification \
  --args "Jane Doe" "Coursera" "Machine Learning" "https://coursera.org/verify/XXXX"
genlayer call  <CONTRACT_ADDRESS> get_verification --args "cred_0"
```

> **Note:** contracts deployed to Bradbury must pin the GenVM runner in the header comment
> (`# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }`);
> the `py-genlayer:test` runner only works on localnet.

---

## Deployment

The primary frontend is a TanStack Start (SSR) app. On Vercel, set the **Root Directory** to
`Design/verichain-aura-main`, use the **Other** preset with build command `npm run build`, and add the
environment variable `NITRO_PRESET=vercel` so Nitro targets the Vercel runtime.

---

## License

Released under the [MIT License](./LICENSE).
