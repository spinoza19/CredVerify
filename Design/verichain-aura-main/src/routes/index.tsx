import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Hero } from "@/components/Hero";
import { VerifyPanel } from "@/components/VerifyPanel";
import { Ledger } from "@/components/Ledger";
import { HowItWorks } from "@/components/HowItWorks";
import { getAllVerifications, type VerificationResult } from "@/lib/genlayer";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [address, setAddress] = useState<string | null>(null);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const verifyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    getAllVerifications().then((rs) => {
      if (!alive) return;
      setResults([...rs].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)));
    });
    return () => { alive = false; };
  }, []);

  function scrollToVerify() {
    document.getElementById("verify")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleNewResult(r: VerificationResult) {
    setResults((prev) => [r, ...prev]);
    setTimeout(() => {
      document.getElementById("ledger")?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  }

  return (
    <main className="relative">
      <Hero onCta={scrollToVerify} address={address} setAddress={setAddress} />
      <div ref={verifyRef}>
        <VerifyPanel address={address} setAddress={setAddress} onNewResult={handleNewResult} />
      </div>
      <HowItWorks />
      <Ledger results={results} />
      <footer className="border-t border-border px-6 md:px-12 py-10 font-mono text-[10px] tracking-[0.3em] text-muted-foreground flex flex-wrap items-center justify-between gap-4">
        <span>© CREDVERIFY · GENLAYER BRADBURY · CHAIN 4221</span>
        <span>CONTRACT 0x042b…E1F0</span>
        <a href="https://explorer-bradbury.genlayer.com/" target="_blank" rel="noopener noreferrer" className="hover:text-acid">
          EXPLORER ↗
        </a>
      </footer>
    </main>
  );
}
