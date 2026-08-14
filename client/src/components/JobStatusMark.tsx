const styles = {
  Submitted: "bg-zinc-100 text-zinc-900",
  Pending: "bg-amber-200 text-zinc-900",
  Approved: "bg-sky-200 text-zinc-900",
  Printing: "bg-[#e32718] text-white",
  Completed: "bg-lime-300 text-zinc-900",
  Failed: "bg-zinc-900 text-white",
  Cancelled: "bg-zinc-300 text-zinc-900",
} as const;

export function JobStatusMark({ status }: { status: keyof typeof styles }) {
  return <span className={`inline-flex rounded-none px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${styles[status]}`}>{status}</span>;
}
