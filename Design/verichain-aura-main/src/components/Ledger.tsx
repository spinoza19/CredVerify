import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { VerificationResult } from "@/lib/genlayer";

gsap.registerPlugin(ScrollTrigger);

const verdictStyle = {
  VALID: {
    label: "VERIFIED",
    color: "var(--acid)",
    tone: "bg-acid text-primary-foreground",
    mark: "✓",
    caption: "The claim stands.",
  },
  INVALID: {
    label: "FRAUDULENT",
    color: "var(--crimson)",
    tone: "bg-destructive text-destructive-foreground",
    mark: "✕",
    caption: "The claim collapses on inspection.",
  },
  UNCERTAIN: {
    label: "INCONCLUSIVE",
    color: "var(--amber)",
    tone: "text-amber",
    mark: "?",
    caption: "The evidence is partial.",
  },
} as const;

export function Ledger({ results }: { results: VerificationResult[] }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".ldg-head > *", {
        y: 30, opacity: 0, stagger: 0.08, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: ".ldg-head", start: "top 80%" },
      });
      gsap.utils.toArray<HTMLElement>(".ldg-card").forEach((el) => {
        gsap.from(el, {
          y: 60, opacity: 0, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });
    }, root);
    return () => ctx.revert();
  }, [results.length]);

  return (
    <section id="ledger" ref={root} className="relative px-6 md:px-12 py-24 md:py-32 border-t border-border">
      <div className="mx-auto max-w-6xl">
        <div className="ldg-head flex flex-wrap items-end justify-between gap-6 mb-16">
          <div>
            <div className="font-mono text-[11px] tracking-[0.3em] text-violet">§ 03 — THE LEDGER</div>
            <h2 className="mt-6 font-display text-5xl md:text-6xl leading-[0.95]">
              Every verdict, <span className="font-serif italic text-acid">public.</span>
            </h2>
          </div>
          <div className="font-mono text-xs text-muted-foreground max-w-xs">
            Read directly from the Intelligent Contract on Bradbury. Newest first.
            <br /><span className="text-acid">{results.length}</span> records in view.
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {results.map((r) => (
            <ResultCard key={String(r.id) + r.verify_url} r={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ResultCard({ r }: { r: VerificationResult }) {
  const v = verdictStyle[r.verdict];
  const isValid = r.verdict === "VALID";
  const isInvalid = r.verdict === "INVALID";

  return (
    <article
      className="ldg-card group relative overflow-hidden rounded-md border border-border bg-card/70 backdrop-blur transition hover:border-acid/40"
      style={{
        boxShadow: isValid
          ? "0 0 0 1px oklch(0.88 0.22 135 / 0.15), 0 20px 60px -30px oklch(0.88 0.22 135 / 0.4)"
          : isInvalid
          ? "0 0 0 1px oklch(0.62 0.24 25 / 0.2), 0 20px 60px -30px oklch(0.62 0.24 25 / 0.4)"
          : undefined,
      }}
    >
      {/* Verdict hero band */}
      <div
        className="relative flex items-center justify-between px-6 py-5 border-b border-border overflow-hidden"
        style={{
          background: isValid
            ? "linear-gradient(90deg, oklch(0.88 0.22 135 / 0.18), transparent)"
            : isInvalid
            ? "linear-gradient(90deg, oklch(0.62 0.24 25 / 0.18), transparent)"
            : "linear-gradient(90deg, oklch(0.82 0.16 75 / 0.12), transparent)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="grid h-12 w-12 place-items-center rounded-sm font-display text-2xl"
            style={{
              background: v.color,
              color: r.verdict === "UNCERTAIN" ? "var(--background)" : "var(--background)",
              boxShadow: `0 0 30px -4px ${v.color}`,
            }}
          >
            {v.mark}
          </div>
          <div>
            <div className="font-display text-2xl md:text-3xl tracking-tight" style={{ color: v.color }}>
              {v.label}
            </div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground mt-0.5">
              {v.caption} · CONFIDENCE {r.confidence}
            </div>
          </div>
        </div>
        <div className="font-mono text-[10px] tracking-widest text-muted-foreground text-right">
          #{String(r.id).padStart(4, "0")}
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">
        <div>
          <div className="font-display text-2xl leading-tight">{r.candidate_name}</div>
          <div className="font-mono text-xs text-muted-foreground mt-1">
            {r.institution} · {r.credential_title}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MatchPill label="NAME" ok={r.name_match} />
          <MatchPill label="ISSUER" ok={r.institution_match} />
          <MatchPill label="TITLE" ok={r.title_match} />
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em]">
          <span className={r.domain_authoritative ? "text-acid" : "text-amber"}>
            {r.domain_authoritative ? "◆ AUTHORITATIVE SOURCE" : "◇ UNVERIFIED SOURCE"}
          </span>
          <span className="text-muted-foreground truncate">· {r.issuer_domain}</span>
        </div>

        <p className="text-sm text-bone/80 leading-relaxed border-l-2 pl-4" style={{ borderColor: v.color }}>
          {r.summary}
        </p>

        <div className="flex items-center justify-between border-t border-border pt-4 font-mono text-[10px] tracking-widest text-muted-foreground">
          <span>REQ {r.requester}</span>
          <a
            href={r.verify_url}
            target="_blank" rel="noopener noreferrer"
            className="hover:text-acid transition truncate max-w-[50%]"
          >
            SOURCE ↗
          </a>
        </div>
      </div>
    </article>
  );
}

function MatchPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-sm border px-3 py-2 font-mono text-[10px] tracking-[0.25em] ${
        ok ? "border-acid/40 text-acid" : "border-destructive/40 text-destructive"
      }`}
      style={{
        background: ok ? "oklch(0.88 0.22 135 / 0.06)" : "oklch(0.62 0.24 25 / 0.06)",
      }}
    >
      <span>{label}</span>
      <span>{ok ? "✓" : "✕"}</span>
    </div>
  );
}
