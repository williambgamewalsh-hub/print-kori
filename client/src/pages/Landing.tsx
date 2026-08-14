import { startLogin } from "@/const";
import { useEffect } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ClipboardCheck,
  FileUp,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Printer,
} from "lucide-react";
import { landingFeatures, landingPromises, landingWorkflow } from "./landingContent";

export default function Landing() {
  useEffect(() => {
    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      revealTargets.forEach(target => target.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -56px" },
    );

    revealTargets.forEach(target => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="landing-motion overflow-hidden bg-[#fbfbfa] text-[#111111]">
      <section className="grid min-h-screen grid-cols-1 border-b border-black md:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col border-b border-black p-6 md:border-b-0 md:border-r md:p-10 lg:p-14">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em]">
            <span>PrintKori / 01</span>
            <span>Cloud print operations</span>
          </div>
          <div className="my-auto py-20 md:py-0">
            <div className="motion-hero-mark mb-8 h-10 w-10 bg-[#e32718]" />
            <h1 className="motion-hero-title max-w-4xl text-6xl font-black leading-[0.88] tracking-[-0.07em] sm:text-7xl lg:text-9xl">
              PRINT,
              <br />
              WITHOUT
              <br />
              FRICTION.
            </h1>
            <p className="motion-hero-copy mt-10 max-w-xl text-lg leading-relaxed text-zinc-700">
              A precise link between a customer’s phone, a shop’s counter, and its printer computer.
            </p>
            <div className="motion-hero-actions mt-10 flex flex-wrap gap-3">
              <button className="red-action motion-action" onClick={() => startLogin("/dashboard")}>
                Get Started <ArrowUpRight className="h-5 w-5" />
              </button>
              <a href="#how-it-works" className="motion-outline inline-flex items-center gap-2 border border-black px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] transition hover:bg-black hover:text-white">
                See how it works <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            Customer? Scan your shop QR code to place an order.
          </p>
        </div>
        <div className="grid grid-rows-[1fr_auto] bg-[#e32718] text-white">
          <div className="relative flex items-center justify-center overflow-hidden p-10">
            <div className="absolute left-0 top-0 h-24 w-24 border-b border-r border-black/20" />
            <div className="motion-hero-qr grid h-64 w-64 grid-cols-7 gap-1.5 bg-white p-5 shadow-[12px_12px_0_#111] sm:h-80 sm:w-80">
              {Array.from({ length: 49 }).map((_, index) => {
                const on = [0, 1, 2, 4, 6, 7, 8, 14, 16, 18, 20, 21, 22, 24, 25, 27, 29, 31, 32, 34, 35, 36, 38, 40, 42, 43, 44, 46, 48].includes(index);
                return <span key={index} className={on ? "bg-black" : "bg-transparent"} />;
              })}
            </div>
            <span className="absolute bottom-8 right-8 text-xs font-bold uppercase tracking-[0.16em]">One scan / one order</span>
          </div>
          <div className="grid grid-cols-2 border-t border-black/30">
            <div className="border-r border-black/30 p-6">
              <QrCode className="mb-10 h-7 w-7" />
              <p className="text-sm font-bold uppercase tracking-[0.13em]">Scan. Upload. Confirm.</p>
            </div>
            <div className="p-6">
              <Printer className="mb-10 h-7 w-7" />
              <p className="text-sm font-bold uppercase tracking-[0.13em]">Approve. Print. Track.</p>
            </div>
          </div>
        </div>
      </section>

      <section data-reveal="true" className="border-b border-black bg-[#111111] px-6 py-28 text-white sm:px-10 sm:py-32 lg:px-16 lg:py-40">
        <div className="grid gap-16 lg:grid-cols-[0.72fr_1.28fr] lg:gap-28">
          <div>
            <div className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.17em] text-[#ff5a4c]">
              <Sparkles className="h-4 w-4" /> Featured / one system
            </div>
            <h2 className="max-w-md text-4xl font-black leading-[0.92] tracking-[-0.05em] sm:text-5xl">
              BUILT FOR THE COUNTER, NOT A COMPLEX OFFICE.
            </h2>
            <p className="mt-9 max-w-md leading-relaxed text-zinc-300">
              PrintKori keeps the real work simple: customers place clear requests, owners make the decision, and the connected printer gets only approved jobs.
            </p>
          </div>
          <div className="grid divide-y divide-white/20 border-y border-white/20">
            {landingFeatures.map(feature => (
              <article key={feature.eyebrow} className="grid gap-5 py-10 sm:grid-cols-[70px_1fr_auto] sm:items-start sm:gap-8 lg:py-12">
                <span className="font-mono text-sm text-[#ff5a4c]">{feature.eyebrow.split(" /")[0]}</span>
                <div>
                  <p className="text-xl font-bold tracking-[-0.03em]">{feature.title}</p>
                  <p className="mt-3 max-w-xl leading-relaxed text-zinc-300">{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal="true" className="grid border-b border-black lg:grid-cols-[1fr_1fr]" id="why-printkori">
        <div className="bg-[#e32718] p-8 text-white sm:p-14 lg:p-20">
          <p className="text-xs font-bold uppercase tracking-[0.17em]">Why PrintKori</p>
          <h2 className="mt-24 max-w-xl text-5xl font-black leading-[0.88] tracking-[-0.06em] sm:text-6xl">
            KEEP THE SHOP IN CONTROL.
          </h2>
          <div className="mt-24 flex items-center gap-4 border-t border-white/30 pt-8 text-sm font-medium leading-relaxed text-white/85">
            <ShieldCheck className="h-7 w-7 shrink-0" />
            Every print job requires shop approval before it is sent to the printer.
          </div>
        </div>
        <div className="grid bg-[#fbfbfa] sm:grid-cols-2">
          {landingPromises.map((promise, index) => (
            <div key={promise} className="flex min-h-60 flex-col justify-between border-b border-black p-8 last:border-b-0 sm:border-b-0 sm:border-r sm:even:border-r-0 sm:[&:nth-child(n+3)]:border-t sm:p-12 lg:min-h-72 lg:p-14">
              <span className="font-mono text-sm text-[#e32718]">0{index + 1}</span>
              <div>
                <Check className="mb-4 h-5 w-5" />
                <p className="max-w-48 text-lg font-bold leading-tight tracking-[-0.03em]">{promise}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section data-reveal="true" id="how-it-works" className="border-b border-black px-6 py-28 sm:px-10 sm:py-32 lg:px-16 lg:py-40">
        <div className="flex flex-col justify-between gap-10 border-b border-black pb-12 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#e32718]">The operating flow</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">THREE MOVES. CLEAR HANDOFFS.</h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-600">A human shop decision sits between the customer upload and the physical printer—exactly where it should be.</p>
        </div>
        <div className="grid md:grid-cols-3">
          {landingWorkflow.map(([number, title, description], index) => {
            const Icon = [ScanLine, ClipboardCheck, FileUp][index];
            return (
              <article key={number} className="group border-b border-black py-14 md:border-b-0 md:border-r md:px-10 md:first:pl-0 md:last:border-r-0 md:last:pr-0 lg:py-20">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-sm text-[#e32718]">{number}</span>
                  <Icon className="h-6 w-6 transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110" />
                </div>
                <h3 className="mt-20 text-2xl font-black tracking-[-0.04em]">{title}</h3>
                <p className="mt-4 max-w-xs leading-relaxed text-zinc-600">{description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section data-reveal="true" className="grid border-b border-black lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex min-h-96 flex-col justify-between bg-[#f1efea] p-8 sm:p-14 lg:min-h-[34rem] lg:p-20">
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.17em]"><Printer className="h-4 w-4 text-[#e32718]" /> Ready when the printer is</div>
          <div>
            <p className="max-w-xl text-3xl font-black leading-[0.95] tracking-[-0.05em] sm:text-4xl">CUSTOMERS SEE AVAILABILITY. OWNERS KEEP THE PRINTER VISIBLE.</p>
            <p className="mt-7 max-w-xl leading-relaxed text-zinc-600">The public order page explains when no connected printer is ready, so customers are not left guessing. The shop agent stays transparent and configurable from the dashboard.</p>
          </div>
        </div>
        <div className="bg-[#111111] p-8 text-white sm:p-14 lg:p-20">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#ff5a4c]">Start with your shop</p>
          <h2 className="mt-20 max-w-xl text-5xl font-black leading-[0.88] tracking-[-0.06em] sm:text-6xl">YOUR QR. YOUR PRINTER. YOUR RULES.</h2>
          <p className="mt-9 max-w-xl leading-relaxed text-zinc-300">Set your name, logo, four core pricing rules, paper options, and staff access. PrintKori builds the shop flow around those choices.</p>
          <button className="red-action motion-action mt-12" onClick={() => startLogin("/dashboard")}>
            Set up PrintKori <ArrowUpRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      <footer data-reveal="true" className="bg-[#111111] px-6 py-14 text-white md:px-10 md:py-16 lg:px-16 lg:py-20">
        <div className="grid gap-12 border-b border-white/20 pb-12 md:grid-cols-[1fr_auto_auto] md:items-start">
          <div>
            <p className="text-2xl font-black tracking-[-0.05em]">PRINTKORI<span className="text-[#e32718]">.</span></p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">Cloud print operations for practical local print shops.</p>
          </div>
          <a href="#why-printkori" className="text-sm font-bold uppercase tracking-[0.13em] text-zinc-300 transition hover:text-white">Why PrintKori</a>
          <button className="text-left text-sm font-bold uppercase tracking-[0.13em] text-zinc-300 transition hover:text-white" onClick={() => startLogin("/dashboard")}>Shop dashboard</button>
        </div>
        <div className="flex flex-col gap-3 pt-7 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>PrintKori / Print without friction</span>
          <span>© {new Date().getFullYear()} PrintKori</span>
        </div>
      </footer>
    </main>
  );
}
