import { JobStatusMark } from "@/components/JobStatusMark";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Check, FileUp, Loader2, Printer, ScanLine } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";

type ColorMode = "Color" | "Grayscale";
type Sides = "Single-sided" | "Double-sided";

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("The selected file could not be read"));
    reader.readAsDataURL(file);
  });
}

export default function CustomerOrder() {
  const [, params] = useRoute("/s/:slug");
  const [, setLocation] = useLocation();
  const slug = params?.slug ?? "";
  const shopQuery = trpc.printKori.publicShop.useQuery({ slug });
  const [file, setFile] = useState<File | null>(null);
  const [customerReference, setCustomerReference] = useState("");
  const [paperOptionId, setPaperOptionId] = useState<number | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("Grayscale");
  const [sides, setSides] = useState<Sides>("Single-sided");
  const [copies, setCopies] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    if (!paperOptionId && shopQuery.data?.papers[0]) setPaperOptionId(shopQuery.data.papers[0].id);
  }, [paperOptionId, shopQuery.data?.papers]);

  const quoteInput = useMemo(
    () => ({ shopSlug: slug, paperOptionId: paperOptionId ?? 1, colorMode, sides, copies, pageCount }),
    [slug, paperOptionId, colorMode, sides, copies, pageCount],
  );
  const quote = trpc.printKori.quote.useQuery(quoteInput, { enabled: Boolean(paperOptionId) });
  const submit = trpc.printKori.submitCustomerJob.useMutation({
    onSuccess: job => {
      toast.success("Your print request is now Pending.");
      setLocation(`/status/${job.publicStatusToken}`);
    },
    onError: error => toast.error(error.message),
  });

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (selected && selected.size > 10 * 1024 * 1024) {
      toast.error("Please use a file smaller than 10 MB.");
      event.target.value = "";
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async () => {
    if (!file || !paperOptionId) {
      toast.error("Choose a file and a paper option before sending your request.");
      return;
    }
    try {
      const fileDataBase64 = await readFileAsBase64(file);
      submit.mutate({
        ...quoteInput,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileDataBase64,
        customerReference: customerReference || undefined,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare the file.");
    }
  };

  if (shopQuery.isLoading) {
    return <div className="public-center"><Loader2 className="h-7 w-7 animate-spin" /> Loading shop…</div>;
  }
  if (!shopQuery.data) {
    return <div className="public-center"><div><p className="kicker">PrintKori / Customer</p><h1 className="mt-3 text-4xl font-black tracking-[-0.06em]">SHOP NOT FOUND.</h1><p className="mt-4 text-zinc-600">Ask the shop for an active QR code.</p></div></div>;
  }
  const shop = shopQuery.data;

  return (
    <main className="min-h-screen bg-[#fbfbfa] text-[#111111]">
      <header className="grid grid-cols-[1fr_auto] border-b border-black px-5 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {shop.logoUrl ? <img src={shop.logoUrl} alt="" className="h-9 w-9 object-cover" /> : <span className="h-9 w-9 bg-[#e32718]" />}
          <div className="min-w-0"><p className="kicker">Print request</p><h1 className="truncate text-lg font-black tracking-[-0.04em]">{shop.name}</h1></div>
        </div>
        <ScanLine className="h-7 w-7" aria-label="QR order" />
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 lg:grid-cols-[1fr_360px]">
        <section className="border-b border-black p-5 sm:p-8 lg:border-b-0 lg:border-r lg:p-12">
          <Link href="/" className="mb-10 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-600 hover:text-black"><ArrowLeft className="h-4 w-4" /> PrintKori</Link>
          <div className="mb-10 max-w-xl"><p className="kicker">01 / Upload and configure</p><h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.06em] sm:text-5xl">SEND A FILE.<br />WE’LL QUEUE THE PRINT.</h2></div>
          <div className="grid gap-8">
            <label className="upload-zone">
              <input className="sr-only" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={selectFile} />
              <FileUp className="h-7 w-7" />
              <span className="mt-4 text-lg font-bold">{file ? file.name : "Choose a document or image"}</span>
              <span className="mt-1 text-sm text-zinc-600">PDF, DOCX, JPG or PNG · maximum 10 MB</span>
            </label>
            <label className="field-group"><span>Reference name (optional)</span><input value={customerReference} onChange={event => setCustomerReference(event.target.value)} placeholder="Your name or order reference" /></label>
            <div className="field-group"><span>Paper size</span><div className="choice-grid">{shop.papers.map(paper => <button key={paper.id} onClick={() => setPaperOptionId(paper.id)} className={paperOptionId === paper.id ? "choice active" : "choice"}>{paper.name}{paperOptionId === paper.id && <Check className="h-4 w-4" />}</button>)}</div></div>
            <div className="grid gap-8 sm:grid-cols-2">
              <ChoiceGroup label="Ink" value={colorMode} options={["Grayscale", "Color"] as ColorMode[]} onChange={setColorMode} />
              <ChoiceGroup label="Sides" value={sides} options={["Single-sided", "Double-sided"] as Sides[]} onChange={setSides} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field-group"><span>Copies</span><input type="number" min="1" max="100" value={copies} onChange={event => setCopies(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} /></label>
              <label className="field-group"><span>Pages per copy</span><input type="number" min="1" max="1000" value={pageCount} onChange={event => setPageCount(Math.max(1, Math.min(1000, Number(event.target.value) || 1)))} /></label>
            </div>
          </div>
        </section>
        <aside className="bg-[#111111] p-5 text-white sm:p-8 lg:min-h-screen lg:p-10">
          <div className="sticky top-8"><p className="kicker text-zinc-400">02 / Price summary</p><div className="my-8 h-px bg-white/30" />
            <div className="space-y-4 text-sm"><SummaryRow label="Print" value={`${colorMode} · ${sides}`} /><SummaryRow label="Paper" value={quote.data?.paperName ?? "Select paper"} /><SummaryRow label="Volume" value={`${copies} copies × ${pageCount} pages`} /></div>
            <div className="my-8 border-y border-white/30 py-6"><p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">Estimated total</p><p className="mt-2 text-4xl font-black tracking-[-0.06em]">{quote.isLoading ? "…" : formatMoney(quote.data?.priceCents ?? 0, shop.currency)}</p></div>
            <p className="mb-6 text-sm leading-relaxed text-zinc-300">Your request will remain <strong className="font-bold text-white">Pending</strong> until the shop confirms payment.</p>
            <button className="w-full bg-[#e32718] px-4 py-4 text-sm font-black uppercase tracking-[0.12em] transition-transform active:scale-[.98] disabled:opacity-50" disabled={!file || submit.isPending || quote.isLoading} onClick={handleSubmit}>{submit.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : <span className="inline-flex items-center gap-2">Send to shop <ArrowRight className="h-4 w-4" /></span>}</button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ChoiceGroup<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (value: T) => void }) {
  return <div className="field-group"><span>{label}</span><div className="choice-grid">{options.map(option => <button key={option} onClick={() => onChange(option)} className={value === option ? "choice active" : "choice"}>{option}{value === option && <Check className="h-4 w-4" />}</button>)}</div></div>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4"><span className="text-zinc-400">{label}</span><span className="text-right font-bold">{value}</span></div>;
}

function formatMoney(cents: number, _currency: string) {
  return `${(cents / 100).toFixed(2)} Tk`;
}
