<div align="center">

# CredVerify

### On-chain credential and diploma verification, powered by GenLayer

[![Network](https://img.shields.io/badge/GenLayer-Bradbury_Testnet-9AE600?style=flat-square)](https://explorer-bradbury.genlayer.com/)
[![Chain ID](https://img.shields.io/badge/Chain_ID-4221-8B5CF6?style=flat-square)](https://rpc-bradbury.genlayer.com)
[![Contract](https://img.shields.io/badge/Contract-0x233b…C9f1-1f2937?style=flat-square)](https://explorer-bradbury.genlayer.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](./LICENSE)

</div>

## Overview

CredVerify verifies academic and professional credentials with no registrar, no central server, and no trusted middleman. A GenLayer Intelligent Contract fetches the credential's verification page live from the web, adjudicates it with an LLM, reaches validator consensus, and records a public, tamper evident verdict on-chain.

This is a use case only GenLayer enables: it needs live web access, LLM reasoning, and multi validator consensus at once (trustless adjudication of a subjective claim).

## How it works

`request_verification(candidate_name, institution, credential_title, verify_url)`

1. Fetches the verification page live from the open web.
2. An LLM checks whether the page confirms the claimed name, issuer, and title.
3. Validators must agree on the verdict (Optimistic Democracy).
4. The result is stored on-chain: `VALID`, `INVALID`, or `UNCERTAIN`, with a confidence level and per field match flags.

## Security

* **Issuer domain binding.** The contract extracts the host of every `verify_url`. If it is not a recognized issuer, platform, or academic domain (`.edu`, `.ac.uk`, ...), the verdict is deterministically capped at `UNCERTAIN` and can never be `VALID`. A requester cannot certify a page they control. Each record stores `issuer_domain` and `domain_authoritative`.
* **No mock verdicts.** The frontend performs only real on-chain reads and writes. A failed or unfinalized call shows an explicit error or a pending state, never a fabricated verified result.

## Contract API

| Method | Type | Description |
| --- | --- | --- |
| `request_verification(candidate_name, institution, credential_title, verify_url)` | write | Runs a verification and stores the result |
| `get_all()` | view | Returns every verification record |
| `get_verification(request_id)` | view | Returns a single record |
| `get_total()` | view | Returns the number of verifications |

**Deployed on GenLayer Bradbury testnet:** [`0x233b8d90A546e0e57934345d2939bb931eEAC9f1`](https://explorer-bradbury.genlayer.com/)

## Repository

```
contracts/credverify.py          GenLayer Intelligent Contract (Python)
Design/verichain-aura-main/      Frontend: React 19, TanStack Start, Tailwind v4, GSAP
app/                             Alternate frontend: Vue 3 + Vite
```

## Tech stack

Python Intelligent Contract on GenVM, React 19, TanStack Start, Tailwind CSS v4, GSAP, `genlayer-js` with an EVM (MetaMask / EIP-1193) wallet adapter. Network: GenLayer Bradbury testnet, chain ID `4221`.

## Quick start

```bash
cd Design/verichain-aura-main
npm install
npm run dev        # http://localhost:8080  (needs Node >= 20.19 or 22.12)
```

The contract address is set in `src/lib/genlayer.ts`, so the app connects to the live contract out of the box. Connect MetaMask (Bradbury network, some GEN from the faucet) to run real on-chain verifications.

## License

[MIT](./LICENSE)
