import { startLogin } from "@/const";
import { ArrowUpRight, QrCode, Printer } from "lucide-react";

export default function Landing() {
  return (
    <main className="min-h-screen bg-[#fbfbfa] text-[#111111]">
      <section className="grid min-h-screen grid-cols-1 border-b border-black md:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col border-b border-black p-6 md:border-b-0 md:border-r md:p-10 lg:p-14">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em]">
            <span>PrintKori / 01</span>
            <span>Cloud print operations</span>
          </div>
          <div className="my-auto py-20 md:py-0">
            <div className="mb-8 h-10 w-10 bg-[#e32718]" />
            <h1 className="max-w-4xl text-6xl font-black leading-[0.88] tracking-[-0.07em] sm:text-7xl lg:text-9xl">
              PRINT,
              <br />
              WITHOUT
              <br />
              FRICTION.
            </h1>
            <p className="mt-10 max-w-xl text-lg leading-relaxed text-zinc-700">
              A precise link between a customer’s phone, a shop’s counter, and its printer computer.
            </p>
            <button className="red-action mt-10" onClick={() => startLogin()}>
              Open shop dashboard <ArrowUpRight className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            Customer? Scan your shop QR code to place an order.
          </p>
        </div>
        <div className="grid grid-rows-[1fr_auto] bg-[#e32718] text-white">
          <div className="flex items-center justify-center p-10">
            <div className="grid h-64 w-64 grid-cols-7 gap-1.5 bg-white p-5 shadow-[12px_12px_0_#111] sm:h-80 sm:w-80">
              {Array.from({ length: 49 }).map((_, index) => {
                const on = [0, 1, 2, 4, 6, 7, 8, 14, 16, 18, 20, 21, 22, 24, 25, 27, 29, 31, 32, 34, 35, 36, 38, 40, 42, 43, 44, 46, 48].includes(index);
                return <span key={index} className={on ? "bg-black" : "bg-transparent"} />;
              })}
            </div>
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
    </main>
  );
}
