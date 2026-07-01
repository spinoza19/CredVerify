import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { connectWallet, short } from "@/lib/wallet";

export function Hero({
  onCta,
  address,
  setAddress,
}: {
  onCta: () => void;
  address: string | null;
  setAddress: (a: string | null) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [connecting, setConnecting] = useState(false);

  async function handleConnect() {
    setConnecting(true);
    try {
      const a = await connectWallet();
      setAddress(a);
    } catch (e) {
      console.error(e);
    } finally {
      setConnecting(false);
    }
  }

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.from(".h-eyebrow", { y: 24, opacity: 0, duration: 0.8 })
        .from(".h-word", { yPercent: 110, opacity: 0, stagger: 0.08, duration: 1.1 }, "-=0.4")
        .from(".h-sub", { y: 20, opacity: 0, duration: 0.8 }, "-=0.6")
        .from(".h-meta > *", { y: 12, opacity: 0, stagger: 0.08, duration: 0.6 }, "-=0.5")
        .from(".h-cta", { y: 16, opacity: 0, duration: 0.6 }, "-=0.4")
        .from(".h-ring", { scale: 0.4, opacity: 0, duration: 1.4, ease: "expo.out" }, "-=1.2");

      // Floating orb
      gsap.to(".h-orb", {
        y: 20, duration: 4, ease: "sine.inOut", yoyo: true, repeat: -1,
      });
      gsap.to(".h-orb", {
        rotation: 360, duration: 40, ease: "none", repeat: -1,
      });

      // Ticker digits
      gsap.utils.toArray<HTMLElement>(".h-tick").forEach((el, i) => {
        gsap.to(el, {
          textContent: 1000 + i * 137,
          duration: 2.2,
          delay: 1 + i * 0.1,
          snap: { textContent: 1 },
          ease: "power2.out",
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative min-h-[100svh] overflow-hidden noise">
      {/* Grid + gradient backdrop */}
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute inset-0 scanline opacity-40 pointer-events-none" />
      <div
        className="absolute -top-40 -right-40 h-[70vh] w-[70vh] rounded-full blur-3xl opacity-40"
        style={{ background: "radial-gradient(closest-side, var(--acid), transparent 70%)" }}
      />
      <div
        className="absolute -bottom-40 -left-40 h-[70vh] w-[70vh] rounded-full blur-3xl opacity-30"
        style={{ background: "radial-gradient(closest-side, var(--violet), transparent 70%)" }}
      />

      {/* Floating seal */}
      <div className="absolute right-[6%] top-1/2 -translate-y-1/2 hidden lg:block">
        <div className="h-orb relative h-[420px] w-[420px]">
          <svg viewBox="0 0 400 400" className="h-full w-full">
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="oklch(0.88 0.22 135)" />
                <stop offset="1" stopColor="oklch(0.68 0.24 305)" />
              </linearGradient>
            </defs>
            <circle cx="200" cy="200" r="180" fill="none" stroke="url(#ringGrad)" strokeWidth="1" className="h-ring" />
            <circle cx="200" cy="200" r="140" fill="none" stroke="oklch(1 0 0 / 0.15)" strokeDasharray="2 6" className="h-ring" />
            <circle cx="200" cy="200" r="90" fill="none" stroke="oklch(0.88 0.22 135 / 0.6)" strokeWidth="1" className="h-ring" />
            <text x="200" y="205" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="oklch(0.96 0.01 90 / 0.7)" letterSpacing="4">
              PROOF · ON · CHAIN
            </text>
            {Array.from({ length: 24 }).map((_, i) => (
              <line
                key={i}
                x1="200" y1="20" x2="200" y2="30"
                stroke="oklch(0.88 0.22 135 / 0.5)"
                transform={`rotate(${i * 15} 200 200)`}
              />
            ))}
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">SEAL №</div>
              <div className="font-display text-6xl text-acid">04</div>
              <div className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">BRADBURY</div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="group flex items-center gap-3 transition hover:opacity-90"
          aria-label="CredVerify — back to top"
        >
          <div className="h-8 w-8 rounded-sm bg-acid transition group-hover:scale-105" style={{ boxShadow: "0 0 24px oklch(0.88 0.22 135 / 0.6)" }} />
          <span className="font-mono text-sm tracking-[0.25em] group-hover:text-acid transition">CREDVERIFY</span>
        </button>
        <nav className="hidden md:flex items-center gap-8 font-mono text-xs tracking-widest text-muted-foreground">
          <a href="#verify" className="hover:text-acid transition">VERIFY</a>
          <a href="#ledger" className="hover:text-acid transition">LEDGER</a>
          <a href="#how" className="hover:text-acid transition">HOW·IT·WORKS</a>
        </nav>
        <div className="flex items-center gap-5">
          <div className="font-mono text-[10px] tracking-widest text-muted-foreground hidden lg:block">
            BRADBURY · TESTNET · 4221
          </div>
          {address ? (
            <button
              onClick={() => setAddress(null)}
              className="font-mono text-[10px] tracking-[0.25em] rounded-sm border border-acid/60 px-3 py-2 text-acid transition hover:border-acid hover:bg-acid hover:text-primary-foreground"
              title="Disconnect wallet"
            >
              ● {short(address)}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="font-mono text-[10px] tracking-[0.25em] rounded-sm border border-acid px-4 py-2 text-acid transition hover:bg-acid hover:text-primary-foreground disabled:opacity-50"
              style={{ boxShadow: "0 0 24px -8px oklch(0.88 0.22 135 / 0.7)" }}
            >
              {connecting ? "CONNECTING…" : "CONNECT WALLET"}
            </button>
          )}
        </div>
      </header>

      {/* Copy */}
      <div className="relative z-10 px-6 md:px-12 pt-16 md:pt-24 max-w-4xl">
        <div className="h-eyebrow inline-flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] text-acid">
          <span className="h-1.5 w-1.5 rounded-full bg-acid animate-pulse" />
          FRAUD IS OFF THE MENU
        </div>

        <h1 className="mt-8 font-display text-[13vw] md:text-[8.5vw] leading-[0.82] tracking-tight">
          <div className="overflow-hidden pb-[0.08em]"><span className="h-word inline-block">Verify</span></div>
          <div className="overflow-hidden pb-[0.08em]">
            <span className="h-word inline-block font-serif italic text-acid">every</span>{" "}
            <span className="h-word inline-block">diploma</span>
          </div>
          <div className="overflow-hidden pb-[0.08em]">
            <span className="h-word inline-block">on-chain,</span>
          </div>
          <div className="overflow-hidden pb-[0.08em]">
            <span className="h-word inline-block font-serif italic" style={{ color: "var(--violet)" }}>live.</span>
          </div>
        </h1>

        <p className="h-sub mt-10 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
          A GenLayer Intelligent Contract fetches the credential page from the open web,
          convenes an LLM validator quorum, and stamps a verdict onto the ledger.
          No forms mailed. No registrar called. No trust required.
        </p>

        <div className="h-cta mt-12 flex flex-wrap items-center gap-4">
          <button
            onClick={onCta}
            className="group relative inline-flex items-center gap-3 rounded-sm bg-acid px-7 py-4 font-mono text-xs tracking-[0.25em] text-primary-foreground transition hover:scale-[1.02]"
            style={{ boxShadow: "0 0 40px -6px oklch(0.88 0.22 135 / 0.7)" }}
          >
            RUN A VERIFICATION
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
          <a href="#how" className="font-mono text-xs tracking-[0.25em] text-muted-foreground hover:text-bone">
            READ THE CEREMONY →
          </a>
        </div>

        <div className="h-meta mt-20 flex flex-wrap gap-x-14 gap-y-6 font-mono text-xs">
          <Stat label="ON-CHAIN VERDICTS" value="h-tick" suffix="+" />
          <Stat label="AVG. CONSENSUS TIME" value="94s" />
          <Stat label="VALIDATOR NODES" value="h-tick" />
          <Stat label="FRAUD CAUGHT" value="h-tick" />
        </div>
      </div>

      {/* Marquee */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border/60 bg-background/40 backdrop-blur-sm overflow-hidden">
        <div className="animate-marquee flex whitespace-nowrap py-3 font-mono text-[11px] tracking-[0.3em] text-muted-foreground">
          {Array.from({ length: 2 }).map((_, j) => (
            <div key={j} className="flex items-center gap-10 pr-10">
              {["MIT", "STANFORD", "ETH ZÜRICH", "OXFORD", "IIT BOMBAY", "TSINGHUA", "POLYTECHNIQUE", "TOKYO", "BOCCONI", "NUS", "UCL", "COPENHAGEN"].map((n) => (
                <span key={n} className="flex items-center gap-10">
                  <span>{n}</span>
                  <span className="text-acid">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  const isTick = value === "h-tick";
  return (
    <div>
      <div className="text-muted-foreground/70 tracking-[0.3em]">{label}</div>
      <div className="mt-2 font-display text-3xl text-bone">
        {isTick ? <span className="h-tick">0</span> : value}
        {suffix}
      </div>
    </div>
  );
}
