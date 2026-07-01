# CredVerify — Décentralized Credential Verification (GenLayer)

Vérification décentralisée dyal les diplômes / certificats l les recruteurs sغار & startups.
L Intelligent Contract kayجbد l page dyal verification **live mn l web**, l LLM kay7كم wach
l credential صحيح, o **consensus dyal les validators** kayثبت l verdict on-chain — bla oracle, bla
backend centralisé.

## Stack
- **Contract**: `contracts/credverify.py` (GenVM / Python Intelligent Contract)
- **Frontend**: `app/` — Vue 3 + Vite + Tailwind, **EVM wallet adapter (MetaMask / EIP-1193)**
- **Network**: GenLayer Bradbury Testnet (chainId 4221)

## Deployed contract (Bradbury)
```
0x042b5a214E0552791c40E34Ed4358DE1DB4Ee1F0
```

## Kifach l contract kayخdem
`request_verification(candidate_name, institution, credential_title, verify_url)`:
1. `gl.nondet.web.render(verify_url)` — kayجbد l page live.
2. `gl.nondet.exec_prompt(..., response_format="json")` — l LLM kay7كم (verdict / confidence / matches),
   l output m9يد f valeurs enumérés bach l consensus ykون deterministe.
3. `gl.eq_principle.strict_eq(...)` — les validators kayت2af9o 3la نفس l verdict.
4. Kaykhزن `Verification` record on-chain (verdict, confidence, name/issuer/title match, summary).

Views: `get_all()`, `get_verification(request_id)`, `get_total()`.

> ⚠️ **Runner header muهم**: l header khaSSو ykون l pinned runner id (machi `py-genlayer:test`
> lli kayخdem ghi f localnet):
> `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }`

## Frontend — b MetaMask
```bash
cd app
npm install
# .env kayن fيه: VITE_CONTRACT_ADDRESS="0x042b5a214E0552791c40E34Ed4358DE1DB4Ee1F0"
npm run dev   # http://localhost:5173
```
L wallet adapter (`app/src/services/genlayer.js`):
- `readClient` = `createClient({ chain: testnetBradbury })` — reads bla wallet.
- `connectWallet()` = kayطلب `eth_requestAccounts`, kayzيd/kayبدل l Bradbury network f MetaMask,
  o kayصايب write client `createClient({ chain, account, provider: window.ethereum })`.

Bach dير verification mn l UI khaSSك: MetaMask + Bradbury network + chwiya GEN mn l faucet.

## CLI (deploy / test)
```bash
genlayer account import --private-key <KEY> --name me
genlayer account use me
genlayer network set testnet-bradbury
genlayer deploy --contract contracts/credverify.py
genlayer write <ADDR> request_verification --args "Name" "Issuer" "Title" "https://verify-url"
genlayer call  <ADDR> get_verification --args "cred_0"
```
