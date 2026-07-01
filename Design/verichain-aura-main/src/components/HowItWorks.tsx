import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    n: "I",
    title: "You place the claim",
    body: "Four fields. Candidate, issuer, credential, URL. Signed by your wallet — no account, no email.",
    tag: "WALLET",
  },
  {
    n: "II",
    title: "The contract fetches, live",
    body: "GenLayer's Intelligent Contract opens the verification URL from the open web, inside the transaction itself.",
    tag: "OPTIMISTIC · DEMOCRACY",
  },
  {
    n: "III",
    title: "An LLM adjudicates",
    body: "The model compares your claim to what the page actually says — name, issuer, title, three way match.",
    tag: "LLM · JURY",
  },
  {
    n: "IV",
    title: "Validators reach consensus",
    body: "Independent nodes re-run the judgement. Only a quorum verdict is written to the chain.",
    tag: "QUORUM",
  },
  {
    n: "V",
    title: "The seal is public",
    body: "Verdict, confidence, and the three-check breakdown live on-chain forever. Link it in a résumé or a bid.",
    tag: "IMMUTABLE",
  },
];

export function HowItWorks() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".how-row").forEach((el) => {
        gsap.from(el.querySelectorAll(".how-anim"), {
          y: 40, opacity: 0, stagger: 0.08, duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 80%" },
        });
      });

      const line = root.current?.querySelector(".how-line") as HTMLElement;
      if (line) {
        gsap.fromTo(line, { scaleY: 0 }, {
          scaleY: 1, transformOrigin: "top center", ease: "none",
          scrollTrigger: {
            trigger: root.current, start: "top 60%", end: "bottom 70%", scrub: true,
          },
        });
      }
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="how" ref={root} className="relative px-6 md:px-12 py-24 md:py-32 border-t border-border overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="mx-auto max-w-5xl relative">
        <div className="mb-20 how-row">
          <div className="how-anim font-mono text-[11px] tracking-[0.3em] text-violet">§ 02 — THE CEREMONY</div>
          <h2 className="how-anim mt-6 font-display text-5xl md:text-6xl leading-[0.95] max-w-3xl">
            Five moves, <span className="font-serif italic text-acid">one seal.</span>
          </h2>
          <p className="how-anim mt-6 max-w-xl text-muted-foreground">
            Nothing here trusts a middleman. Every step is either you, the contract,
            or the validator set — and every step is auditable after the fact.
          </p>
        </div>

        <div className="relative pl-16 md:pl-24">
          <div className="absolute left-6 md:left-10 top-2 bottom-2 w-px bg-border" />
          <div className="how-line absolute left-6 md:left-10 top-2 bottom-2 w-px bg-acid origin-top" />

          <div className="space-y-16">
            {steps.map((s) => (
              <div key={s.n} className="how-row relative">
                <div className="how-anim absolute -left-16 md:-left-24 top-0 flex h-12 w-12 items-center justify-center rounded-full border border-acid bg-background font-display text-lg text-acid">
                  {s.n}
                </div>
                <div className="how-anim font-mono text-[10px] tracking-[0.3em] text-muted-foreground">{s.tag}</div>
                <h3 className="how-anim mt-2 font-display text-3xl md:text-4xl">{s.title}</h3>
                <p className="how-anim mt-3 max-w-xl text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
