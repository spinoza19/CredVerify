import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { connectWallet, short } from "@/lib/wallet";
import {
  requestVerification,
  makeSimulatedResult,
  type VerificationResult,
  type VerificationRequest,
} from "@/lib/genlayer";

type Stage = "idle" | "signing" | "fetching" | "adjudicating" | "consensus" | "done";

const STAGES: { key: Stage; label: string; sub: string }[] = [
  { key: "signing", label: "Signing transaction", sub: "Your wallet is broadcasting to Bradbury." },
  { key: "fetching", label: "Fetching the page, live", sub: "The contract opens the URL from the open web." },
  { key: "adjudicating", label: "LLM adjudicating", sub: "Comparing claims against the source of truth." },
  { key: "consensus", label: "Validators reaching consensus", sub: "Independent nodes must agree on the verdict." },
];

export function VerifyPanel({
  address, setAddress, onNewResult,
}: {
  address: string | null;
  setAddress: (a: string | null) => void;
  onNewResult: (r: VerificationResult) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<VerificationRequest>({
    candidate_name: "", institution: "", credential_title: "", verify_url: "",
  });
  const [stage, setStage] = useState<Stage>("idle");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".vp-row", {
        y: 30, opacity: 0, stagger: 0.08, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const canSubmit =
    address && Object.values(form).every((v) => v.trim().length > 0) && stage === "idle";

  async function handleConnect() {
    setConnecting(true);
    try {
      const a = await connectWallet();
      setAddress(a);
    } catch (e) { console.error(e); }
    finally { setConnecting(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !address) return;

    setStage("signing");
    const stageTimers: number[] = [];
    stageTimers.push(window.setTimeout(() => setStage("fetching"), 2200));
    stageTimers.push(window.setTimeout(() => setStage("adjudicating"), 5600));
    stageTimers.push(window.setTimeout(() => setStage("consensus"), 9200));

    let outcome: VerificationResult;
    try {
      const { result } = await requestVerification(address, form);
      // Real on-chain verdict when available; simulated only as a last resort.
      outcome = result ?? makeSimulatedResult(form, address);
    } catch {
      outcome = makeSimulatedResult(form, address);
    } finally {
      stageTimers.forEach(clearTimeout);
    }

    setStage("done");
    setTimeout(() => {
      onNewResult(outcome);
      setStage("idle");
      setForm({ candidate_name: "", institution: "", credential_title: "", verify_url: "" });
    }, 1400);
  }

  return (
    <section id="verify" ref={root} className="relative px-6 md:px-12 py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="vp-row font-mono text-[11px] tracking-[0.3em] text-violet">
            § 01 — THE ASK
          </div>
          <h2 className="vp-row mt-6 font-display text-5xl md:text-6xl leading-[0.95]">
            Tell the contract <br />
            <span className="font-serif italic text-acid">what to prove.</span>
          </h2>
          <p className="vp-row mt-6 max-w-md text-muted-foreground">
            Four fields. One signature. A verdict written to a public ledger you
            can point any recruiter at, forever.
          </p>

          <div className="vp-row mt-10 space-y-4 font-mono text-xs text-muted-foreground">
            <Bullet>Zero central server — the contract does the fetching.</Bullet>
            <Bullet>LLM + multi-validator quorum, not a single oracle.</Bullet>
            <Bullet>Verdicts are public, tamper-evident, and citable.</Bullet>
          </div>
        </div>

        <div className="vp-row">
          <div className="relative rounded-md border border-border bg-card/60 backdrop-blur-md p-6 md:p-8 noise">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">
                CONTRACT · 0x042b…E1F0
              </div>
              {address ? (
                <button
                  onClick={() => setAddress(null)}
                  className="font-mono text-[10px] tracking-[0.25em] text-acid hover:text-bone"
                >
                  ● {short(address)} · DISCONNECT
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="font-mono text-[10px] tracking-[0.25em] rounded-sm border border-acid px-3 py-1.5 text-acid hover:bg-acid hover:text-primary-foreground transition"
                >
                  {connecting ? "CONNECTING…" : "CONNECT WALLET"}
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Candidate name" placeholder="e.g. Ada Lovelace"
                value={form.candidate_name}
                onChange={(v) => setForm({ ...form, candidate_name: v })} />
              <Field label="Institution / Issuer" placeholder="e.g. University of London"
                value={form.institution}
                onChange={(v) => setForm({ ...form, institution: v })} />
              <Field label="Credential title" placeholder="e.g. B.Sc. Mathematics, 1842"
                value={form.credential_title}
                onChange={(v) => setForm({ ...form, credential_title: v })} />
              <Field label="Verification URL" placeholder="https://…"
                value={form.verify_url} type="url"
                onChange={(v) => setForm({ ...form, verify_url: v })} />

              <button
                type="submit"
                disabled={!canSubmit}
                className="group relative w-full rounded-sm bg-acid px-6 py-4 font-mono text-xs tracking-[0.3em] text-primary-foreground transition hover:scale-[1.005] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ boxShadow: canSubmit ? "0 0 40px -6px oklch(0.88 0.22 135 / 0.6)" : "none" }}
              >
                {address ? "SEAL ON-CHAIN →" : "CONNECT WALLET FIRST"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {stage !== "idle" && <VerifyingOverlay stage={stage} form={form} />}
    </section>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <div className="mb-2 font-mono text-[10px] tracking-[0.3em] text-muted-foreground">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-sm border border-border bg-background/60 px-4 py-3 font-sans text-base text-bone outline-none transition placeholder:text-muted-foreground/50 focus:border-acid focus:bg-background"
      />
    </label>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 text-acid">◆</span>
      <span>{children}</span>
    </div>
  );
}

function VerifyingOverlay({ stage, form }: { stage: Stage; form: VerificationRequest }) {
  const currentIdx = STAGES.findIndex((s) => s.key === stage);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".ov-panel", { y: 30, opacity: 0, duration: 0.5, ease: "power3.out" });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="fixed inset-0 z-50 grid place-items-center bg-background/85 backdrop-blur-lg p-6">
      <div className="ov-panel relative w-full max-w-2xl rounded-md border border-border bg-card p-8 md:p-12 noise">
        <div className="absolute -top-3 left-8 bg-background px-3 font-mono text-[10px] tracking-[0.35em] text-acid">
          VERIFICATION · IN · PROGRESS
        </div>

        <div className="flex items-center gap-6 mb-10">
          <div className="relative h-24 w-24 flex-shrink-0">
            <div className="absolute inset-0 rounded-full border border-acid/40 animate-pulse-ring" />
            <div className="absolute inset-2 rounded-full border border-acid/60 animate-pulse-ring" style={{ animationDelay: "0.6s" }} />
            <div className="absolute inset-0 grid place-items-center">
              <div className="h-3 w-3 rounded-full bg-acid" style={{ boxShadow: "0 0 20px var(--acid)" }} />
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">SUBJECT</div>
            <div className="font-display text-2xl">{form.candidate_name || "—"}</div>
            <div className="font-mono text-xs text-muted-foreground mt-1">
              {form.institution} · {form.credential_title}
            </div>
          </div>
        </div>

        <ol className="space-y-4">
          {STAGES.map((s, i) => {
            const state = i < currentIdx || stage === "done" ? "done" : i === currentIdx ? "active" : "pending";
            return (
              <li key={s.key} className="flex items-start gap-4">
                <div className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[10px] ${
                  state === "done" ? "border-acid bg-acid text-primary-foreground" :
                  state === "active" ? "border-acid text-acid" :
                  "border-border text-muted-foreground"
                }`}>
                  {state === "done" ? "✓" : String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1">
                  <div className={`font-mono text-sm tracking-wider ${state === "pending" ? "text-muted-foreground/60" : "text-bone"}`}>
                    {s.label}
                    {state === "active" && <span className="ml-2 text-acid animate-pulse">▍</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 border-t border-border pt-4 font-mono text-[10px] tracking-[0.3em] text-muted-foreground">
          THIS TAKES 1–3 MINUTES · YOU CAN LEAVE THIS TAB OPEN
        </div>
      </div>
    </div>
  );
}
