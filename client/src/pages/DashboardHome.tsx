import { JobStatusMark } from "@/components/JobStatusMark";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import QRCode from "qrcode";
import { Check, Copy, Download, ExternalLink, Loader2, MonitorCog, Plus, QrCode, RefreshCw, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const STEPS = ["Shop name", "Logo", "Pricing rates", "Available paper options", "Staff accounts"];

type OwnerDashboardData = {
  shop: {
    id: number;
    slug: string;
    name: string;
    currency: string;
    setupCompleted: boolean;
  };
  jobs: Array<{
    id: number;
    fileName: string;
    fileUrl: string;
    status: "Submitted" | "Pending" | "Approved" | "Printing" | "Completed" | "Failed" | "Cancelled";
    colorMode: string;
    copies: number;
    pageCount: number;
    paperName: string;
    sides: string;
    priceCents: number;
    createdAt: Date;
  }>;
  agents: Array<{ id: number; deviceName: string; status: string }>;
  papers: Array<{ id: number; name: string }>;
  staff: Array<{ id: number; name: string; accessRole: string }>;
};

export default function DashboardHome() {
  const dashboard = trpc.printKori.ownerDashboard.useQuery(undefined, { refetchInterval: 12000 });
  if (dashboard.isLoading) return <DashboardLayout><div className="public-center"><Loader2 className="h-6 w-6 animate-spin" /> Opening dashboard…</div></DashboardLayout>;
  return <DashboardLayout>{dashboard.data?.shop?.setupCompleted ? <ShopDashboard data={dashboard.data} /> : <SetupWizard onComplete={() => dashboard.refetch()} />}</DashboardLayout>;
}

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [shopName, setShopName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [grayRate, setGrayRate] = useState(300);
  const [colorRate, setColorRate] = useState(1000);
  const [duplexDiscount, setDuplexDiscount] = useState(0);
  const [baseFeeCents, setBaseFeeCents] = useState(0);
  const [staleTimeout, setStaleTimeout] = useState(15);
  const [papers, setPapers] = useState(["A4"]);
  const [paperDraft, setPaperDraft] = useState("");
  const [staff, setStaff] = useState<Array<{ name: string; email: string }>>([]);
  const [staffDraft, setStaffDraft] = useState({ name: "", email: "" });
  const complete = trpc.printKori.completeSetup.useMutation({
    onSuccess: () => { toast.success("Shop setup is complete."); onComplete(); },
    onError: error => toast.error(error.message),
  });
  const addPaper = () => { const value = paperDraft.trim(); if (value && !papers.includes(value)) setPapers([...papers, value]); setPaperDraft(""); };
  const addStaff = () => { if (staffDraft.name.trim() && staffDraft.email.trim()) { setStaff([...staff, { name: staffDraft.name.trim(), email: staffDraft.email.trim() }]); setStaffDraft({ name: "", email: "" }); } };
  const finish = () => complete.mutate({
    shopName,
    logoUrl: logoUrl || null,
    currency: "BDT",
    baseFeeCents,
    staleJobTimeoutMinutes: staleTimeout,
    paperOptions: papers,
    rates: papers.flatMap(paperName => [
      { paperName, colorMode: "Grayscale" as const, sides: "Single-sided" as const, perPageCents: grayRate },
      { paperName, colorMode: "Grayscale" as const, sides: "Double-sided" as const, perPageCents: Math.max(0, grayRate - duplexDiscount) },
      { paperName, colorMode: "Color" as const, sides: "Single-sided" as const, perPageCents: colorRate },
      { paperName, colorMode: "Color" as const, sides: "Double-sided" as const, perPageCents: Math.max(0, colorRate - duplexDiscount) },
    ]),
    staff,
  });
  const nextDisabled = (step === 0 && shopName.trim().length < 3) || (step === 3 && papers.length === 0);
  return <div className="mx-auto max-w-4xl border border-black bg-white"><header className="grid grid-cols-[1fr_auto] border-b border-black p-6 sm:p-8"><div><p className="kicker">PrintKori / First use</p><h1 className="mt-2 text-3xl font-black tracking-[-0.06em]">SET UP YOUR SHOP.</h1></div><span className="flex h-10 w-10 items-center justify-center bg-[#e32718] text-sm font-black text-white">{String(step + 1).padStart(2, "0")}</span></header><div className="grid lg:grid-cols-[200px_1fr]"><aside className="border-b border-black p-5 lg:border-b-0 lg:border-r"><ol className="space-y-3">{STEPS.map((title, index) => <li key={title} className={`flex items-center gap-3 text-xs font-black uppercase tracking-[0.12em] ${index === step ? "text-[#e32718]" : index < step ? "text-black" : "text-zinc-400"}`}><span>{index < step ? <Check className="h-4 w-4" /> : String(index + 1).padStart(2, "0")}</span>{title}</li>)}</ol></aside><section className="p-6 sm:p-10"><p className="kicker">Step {step + 1} of 5</p><h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">{STEPS[step].toUpperCase()}</h2><div className="mt-8">{step === 0 && <Field label="Shop name" value={shopName} onChange={setShopName} placeholder="e.g. Masfi Print Point" />} {step === 1 && <div className="grid gap-5"><Field label="Logo image URL" value={logoUrl} onChange={setLogoUrl} placeholder="https://…" optional />{logoUrl && <div className="flex items-center gap-4 border border-black p-4"><img src={logoUrl} className="h-12 w-12 object-cover" alt="Logo preview" /><span className="text-sm font-bold">Logo preview</span></div>}<p className="text-sm leading-relaxed text-zinc-600">A logo is optional for the first release. You can add or replace it later in settings.</p></div>} {step === 2 && <div className="grid gap-5 sm:grid-cols-2"><NumberField label="Grayscale price / page (poisha)" value={grayRate} onChange={setGrayRate} /><NumberField label="Color price / page (poisha)" value={colorRate} onChange={setColorRate} /><NumberField label="Double-sided discount (poisha)" value={duplexDiscount} onChange={setDuplexDiscount} /><NumberField label="Base fee (poisha)" value={baseFeeCents} onChange={setBaseFeeCents} /><NumberField label="Stale-job timeout (minutes)" value={staleTimeout} onChange={setStaleTimeout} /><p className="text-sm leading-relaxed text-zinc-600 sm:col-span-2">The dashboard will mark a job as <strong>Failed</strong> if its printing agent stops reporting for this configurable time.</p></div>} {step === 3 && <div><div className="flex gap-2"><Input value={paperDraft} onChange={event => setPaperDraft(event.target.value)} placeholder="e.g. Letter, Legal, A5" onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addPaper(); } }} /><Button type="button" onClick={addPaper}><Plus className="h-4 w-4" /> Add</Button></div><div className="mt-6 flex flex-wrap gap-2">{papers.map(paper => <button key={paper} onClick={() => papers.length > 1 && setPapers(papers.filter(item => item !== paper))} className="border border-black bg-zinc-100 px-3 py-2 text-sm font-bold">{paper} <span className="ml-2 text-zinc-500">×</span></button>)}</div><p className="mt-5 text-sm text-zinc-600">Each listed paper option receives the pricing rules from the previous step. Click an option to remove it.</p></div>} {step === 4 && <div><div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><Input value={staffDraft.name} onChange={event => setStaffDraft({ ...staffDraft, name: event.target.value })} placeholder="Staff name" /><Input value={staffDraft.email} onChange={event => setStaffDraft({ ...staffDraft, email: event.target.value })} placeholder="staff@example.com" type="email" /><Button type="button" onClick={addStaff}><Plus className="h-4 w-4" /> Add</Button></div><div className="mt-6 divide-y divide-black border-y border-black">{staff.length ? staff.map(member => <div className="flex items-center justify-between py-3" key={member.email}><div><p className="font-bold">{member.name}</p><p className="text-sm text-zinc-600">{member.email}</p></div><button className="text-xs font-black uppercase" onClick={() => setStaff(staff.filter(item => item.email !== member.email))}>Remove</button></div>) : <p className="py-5 text-sm text-zinc-600">No staff accounts added yet. You remain the Owner.</p>}</div></div>}</div><div className="mt-10 flex items-center justify-between border-t border-black pt-6"><Button variant="outline" disabled={step === 0 || complete.isPending} onClick={() => setStep(step - 1)}>Back</Button>{step < 4 ? <Button disabled={nextDisabled} onClick={() => setStep(step + 1)}>Continue</Button> : <Button disabled={complete.isPending} onClick={finish}>{complete.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete setup"}</Button>}</div></section></div></div>;
}

function ShopDashboard({ data }: { data: OwnerDashboardData }) {
  const utils = trpc.useUtils();
  const [qrSrc, setQrSrc] = useState("");
  const [pairingCode, setPairingCode] = useState<{ code: string; expiresAt: Date; shopName: string } | null>(null);
  const customerUrl = useMemo(() => `${window.location.origin}/s/${data.shop.slug}`, [data.shop.slug]);
  useEffect(() => { QRCode.toDataURL(customerUrl, { width: 480, margin: 2, color: { dark: "#111111", light: "#ffffff" } }).then(setQrSrc).catch(() => toast.error("Could not create the QR code.")); }, [customerUrl]);
  const transition = trpc.printKori.transitionJob.useMutation({ onSuccess: () => utils.printKori.ownerDashboard.invalidate(), onError: error => toast.error(error.message) });
  const pairing = trpc.printKori.createPairingCode.useMutation({ onSuccess: result => setPairingCode(result), onError: error => toast.error(error.message) });
  const downloadQr = () => { const a = document.createElement("a"); a.href = qrSrc; a.download = `${data.shop.slug}-customer-qr.png`; a.click(); };
  const copy = async (text: string, description: string) => { await navigator.clipboard.writeText(text); toast.success(`${description} copied.`); };
  const pendingJobs = data.jobs.filter(job => job.status === "Pending");
  return <div className="mx-auto max-w-7xl space-y-6"><section className="grid border border-black bg-white lg:grid-cols-[1fr_auto]"><div className="p-6 sm:p-8"><p className="kicker">PrintKori / Shop dashboard</p><h1 className="mt-2 text-4xl font-black tracking-[-0.065em] sm:text-5xl">{data.shop.name.toUpperCase()}</h1><div className="mt-8 flex flex-wrap gap-3"><Metric value={pendingJobs.length} label="Pending" /><Metric value={data.jobs.filter(job => job.status === "Printing").length} label="Printing" /><Metric value={data.agents.filter(agent => agent.status === "Online").length} label="Agents online" /></div></div><div className="flex items-end bg-[#e32718] p-6 text-white sm:p-8"><p className="max-w-xs text-lg font-bold leading-tight">Jobs only reach the printer after the shop marks payment as received.</p></div></section><div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><section id="jobs" className="border border-black bg-white"><header className="flex items-center justify-between border-b border-black p-5"><div><p className="kicker">Job inbox</p><h2 className="mt-1 text-2xl font-black tracking-[-0.05em]">PENDING REQUESTS</h2></div><RefreshCw className="h-5 w-5" /></header>{pendingJobs.length ? <div className="divide-y divide-black">{pendingJobs.map(job => <article className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><JobStatusMark status={job.status} /><p className="text-sm font-black">{job.fileName}</p></div><p className="mt-3 text-sm text-zinc-700">{job.colorMode} · {job.sides} · {job.copies} copies · {job.pageCount} pages · {job.paperName}</p><a href={job.fileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.1em] underline">Open file <ExternalLink className="h-3 w-3" /></a></div><div className="flex flex-col justify-between gap-4 lg:items-end"><p className="text-xl font-black">{formatMoney(job.priceCents, data.shop.currency)}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={transition.isPending} onClick={() => transition.mutate({ jobId: job.id, targetStatus: "Cancelled" })}>Cancel</Button><Button size="sm" disabled={transition.isPending} onClick={() => transition.mutate({ jobId: job.id, targetStatus: "Approved" })}>Approve</Button></div></div></article>)}</div> : <Empty text="No Pending print requests. Your QR customer page is ready to share." />}</section><aside className="space-y-6"><section id="qr" className="border border-black bg-white"><div className="border-b border-black p-5"><p className="kicker">Customer entry point</p><h2 className="mt-1 text-2xl font-black tracking-[-0.05em]">SHOP QR CODE</h2></div><div className="p-5">{qrSrc ? <img src={qrSrc} className="mx-auto aspect-square w-48 border border-black p-2" alt={`QR code for ${data.shop.name}`} /> : <Loader2 className="mx-auto my-16 h-7 w-7 animate-spin" />}<p className="mt-5 break-all text-xs text-zinc-600">{customerUrl}</p><div className="mt-5 grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => copy(customerUrl, "Customer link")}><Copy className="h-4 w-4" /> Copy link</Button><Button onClick={downloadQr} disabled={!qrSrc}><Download className="h-4 w-4" /> Download</Button></div></div></section><section id="agent" className="border border-black bg-[#111111] text-white"><div className="p-5"><p className="kicker text-zinc-400">Printer computer</p><h2 className="mt-1 text-2xl font-black tracking-[-0.05em]">AGENT PAIRING</h2>{pairingCode ? <div className="mt-6"><p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">One-time code</p><p className="mt-2 break-all text-2xl font-black tracking-[0.08em]">{pairingCode.code}</p><p className="mt-3 text-sm text-zinc-300">Use this code in the Windows agent within 10 minutes. It can only be used once.</p><Button className="mt-5 w-full bg-[#e32718] hover:bg-[#c82014]" onClick={() => copy(pairingCode.code, "Pairing code")}><Copy className="h-4 w-4" /> Copy code</Button></div> : <div><p className="mt-4 text-sm leading-relaxed text-zinc-300">Create a one-time code, then enter it in the background print agent on the shop computer.</p><Button className="mt-6 w-full bg-[#e32718] hover:bg-[#c82014]" onClick={() => pairing.mutate()} disabled={pairing.isPending}>{pairing.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><MonitorCog className="h-4 w-4" /> Generate pairing code</>}</Button></div>}</div></section></aside></div><section className="grid gap-px border border-black bg-black md:grid-cols-3"><div className="bg-white p-5"><p className="kicker">Agents</p><div className="mt-3 space-y-3">{data.agents.length ? data.agents.map(agent => <div key={agent.id} className="flex items-center justify-between text-sm"><span className="font-bold">{agent.deviceName}</span><span>{agent.status}</span></div>) : <p className="text-sm text-zinc-600">No agent paired yet.</p>}</div></div><div className="bg-white p-5"><p className="kicker">Paper options</p><div className="mt-3 flex flex-wrap gap-2">{data.papers.map(paper => <span key={paper.id} className="border border-black px-2 py-1 text-sm font-bold">{paper.name}</span>)}</div></div><div className="bg-white p-5"><p className="kicker">Staff accounts</p><div className="mt-3 space-y-2">{data.staff.map(member => <p key={member.id} className="text-sm"><span className="font-bold">{member.name}</span> <span className="text-zinc-600">/ {member.accessRole}</span></p>)}</div></div></section><section className="border border-black bg-white"><header className="border-b border-black p-5"><p className="kicker">All jobs</p><h2 className="mt-1 text-2xl font-black tracking-[-0.05em]">STATE HISTORY</h2></header><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-black text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500"><tr><th className="p-4">File</th><th className="p-4">Status</th><th className="p-4">Settings</th><th className="p-4">Total</th><th className="p-4">Submitted</th></tr></thead><tbody>{data.jobs.map(job => <tr className="border-b border-zinc-200 last:border-0" key={job.id}><td className="p-4 font-bold">{job.fileName}</td><td className="p-4"><JobStatusMark status={job.status} /></td><td className="p-4">{job.colorMode} · {job.copies} × {job.paperName}</td><td className="p-4 font-bold">{formatMoney(job.priceCents, data.shop.currency)}</td><td className="p-4 text-zinc-600">{new Date(job.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div></section></div>;
}

function Metric({ value, label }: { value: number; label: string }) { return <div className="border border-black px-4 py-3"><p className="text-2xl font-black tracking-[-0.06em]">{value}</p><p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600">{label}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="p-8 text-sm leading-relaxed text-zinc-600">{text}</div>; }
function Field({ label, value, onChange, placeholder, optional }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; optional?: boolean }) { return <label className="field-group"><span>{label}{optional ? " (optional)" : ""}</span><Input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="field-group"><span>{label}</span><Input type="number" min="0" value={value} onChange={event => onChange(Math.max(0, Number(event.target.value) || 0))} /></label>; }
function formatMoney(cents: number, currency: string) { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100); }
