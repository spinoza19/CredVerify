<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <!-- Header -->
    <header class="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
      <div class="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 flex items-center justify-center font-black text-slate-900">✓</div>
          <div>
            <h1 class="text-xl font-bold tracking-tight">CredVerify</h1>
            <p class="text-xs text-slate-400">Decentralized credential verification · GenLayer Bradbury</p>
          </div>
        </div>

        <div>
          <button
            v-if="!address"
            @click="connect"
            :disabled="connecting"
            class="rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
          >
            {{ connecting ? "Connecting..." : "Connect Wallet" }}
          </button>
          <div v-else class="flex items-center gap-3">
            <span class="rounded-lg bg-slate-800 px-3 py-2 text-sm font-mono">
              <Address :address="address" />
            </span>
            <button @click="disconnect" class="text-xs text-slate-400 hover:text-slate-200 underline">
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
      <!-- Form -->
      <section class="lg:col-span-2">
        <div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 class="text-lg font-semibold mb-1">Verify a credential</h2>
          <p class="text-xs text-slate-400 mb-5">
            The Intelligent Contract fetches the page live from the web and adjudicates it with an LLM + validator consensus.
          </p>

          <label class="block text-xs font-medium text-slate-400 mb-1">Candidate name</label>
          <input v-model="form.candidateName" placeholder="e.g. Jane Doe" class="input" />

          <label class="block text-xs font-medium text-slate-400 mb-1 mt-3">Institution / Issuer</label>
          <input v-model="form.institution" placeholder="e.g. Coursera / Stanford" class="input" />

          <label class="block text-xs font-medium text-slate-400 mb-1 mt-3">Credential title</label>
          <input v-model="form.credentialTitle" placeholder="e.g. Machine Learning" class="input" />

          <label class="block text-xs font-medium text-slate-400 mb-1 mt-3">Verification URL</label>
          <input v-model="form.verifyUrl" placeholder="https://coursera.org/verify/XXXX" class="input" />

          <button
            @click="submit"
            :disabled="submitting || !address"
            class="mt-5 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 px-4 py-2.5 text-sm font-semibold text-slate-900"
          >
            <span v-if="submitting">⏳ Verifying on-chain... (LLM + consensus)</span>
            <span v-else-if="!address">Connect wallet first</span>
            <span v-else>Verify credential</span>
          </button>

          <p v-if="error" class="mt-3 text-xs text-red-400">{{ error }}</p>
          <p v-if="notice" class="mt-3 text-xs text-emerald-400">{{ notice }}</p>
        </div>
      </section>

      <!-- Results -->
      <section class="lg:col-span-3">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">Verifications on-chain <span class="text-slate-500 text-sm">({{ total }})</span></h2>
          <button @click="refresh" class="text-xs text-slate-400 hover:text-slate-200 underline">Refresh</button>
        </div>

        <div v-if="loading" class="text-slate-500 text-sm">Loading...</div>
        <div v-else-if="items.length === 0" class="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-slate-500 text-sm">
          No verifications yet. Submit your first one.
        </div>

        <div v-else class="space-y-3">
          <div v-for="item in items" :key="item.id" class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold">{{ item.candidate_name }}</p>
                <p class="text-xs text-slate-400">{{ item.credential_title }} — {{ item.institution }}</p>
              </div>
              <span :class="badgeClass(item.verdict)">{{ item.verdict }}</span>
            </div>

            <div class="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span :class="chip(item.name_match)">name {{ item.name_match ? "OK" : "✕" }}</span>
              <span :class="chip(item.institution_match)">issuer {{ item.institution_match ? "OK" : "✕" }}</span>
              <span :class="chip(item.title_match)">title {{ item.title_match ? "OK" : "✕" }}</span>
              <span class="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">conf: {{ item.confidence }}</span>
            </div>

            <a :href="item.verify_url" target="_blank" class="mt-2 block text-xs text-indigo-400 hover:underline truncate">
              {{ item.verify_url }}
            </a>
          </div>
        </div>
      </section>
    </main>

    <footer class="max-w-6xl mx-auto px-6 py-8 text-center text-xs text-slate-600">
      Contract: <span class="font-mono">{{ contractAddress }}</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import Address from "./Address.vue";
import CredVerify from "../logic/CredVerify";
import { connectWallet, getConnectedAddress, makeWriteClient, onWalletEvents } from "../services/genlayer";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const cred = new CredVerify(contractAddress);

const address = ref(null);
const connecting = ref(false);
const submitting = ref(false);
const loading = ref(true);
const error = ref("");
const notice = ref("");
const items = ref([]);
const total = ref(0);

const form = reactive({
  candidateName: "",
  institution: "",
  credentialTitle: "",
  verifyUrl: "",
});

const badgeClass = (verdict) => {
  const base = "rounded-full px-3 py-1 text-xs font-bold ";
  if (verdict === "VALID") return base + "bg-emerald-500/20 text-emerald-300";
  if (verdict === "INVALID") return base + "bg-red-500/20 text-red-300";
  return base + "bg-amber-500/20 text-amber-300";
};
const chip = (ok) =>
  "rounded-full px-2 py-0.5 " + (ok ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300");

const connect = async () => {
  error.value = "";
  connecting.value = true;
  try {
    const { address: addr, writeClient } = await connectWallet();
    address.value = addr;
    cred.setWriteClient(writeClient);
  } catch (e) {
    error.value = e.message || String(e);
  } finally {
    connecting.value = false;
  }
};

const disconnect = () => {
  address.value = null;
  cred.setWriteClient(null);
};

const refresh = async () => {
  loading.value = true;
  try {
    items.value = await cred.getAll();
    total.value = await cred.getTotal();
  } catch (e) {
    error.value = e.message || String(e);
  } finally {
    loading.value = false;
  }
};

const submit = async () => {
  error.value = "";
  notice.value = "";
  if (!form.candidateName || !form.institution || !form.credentialTitle || !form.verifyUrl) {
    error.value = "Please fill in all fields.";
    return;
  }
  submitting.value = true;
  try {
    await cred.requestVerification({ ...form });
    notice.value = "✓ Verification recorded on-chain!";
    form.candidateName = form.institution = form.credentialTitle = form.verifyUrl = "";
    await refresh();
  } catch (e) {
    error.value = e.message || String(e);
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  const existing = await getConnectedAddress();
  if (existing) {
    address.value = existing;
    cred.setWriteClient(makeWriteClient(existing));
  }
  onWalletEvents({
    onAccountsChanged: (accs) => {
      address.value = accs?.[0] ?? null;
      cred.setWriteClient(address.value ? makeWriteClient(address.value) : null);
    },
    onChainChanged: () => window.location.reload(),
  });
  await refresh();
});
</script>

<style scoped>
.input {
  width: 100%;
  border-radius: 0.5rem;
  background-color: rgb(15 23 42);
  border: 1px solid rgb(51 65 85);
  padding: 0.55rem 0.75rem;
  font-size: 0.875rem;
  color: rgb(226 232 240);
  outline: none;
}
.input:focus {
  border-color: rgb(99 102 241);
}
</style>
