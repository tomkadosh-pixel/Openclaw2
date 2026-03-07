import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type WalletState = {
  wallet: {
    address: string;
    description?: string | null;
    copy_ratio: number;
    allocation_pct: number;
    max_notional_per_trade: number;
    stop_loss_pct: number;
    daily_loss_cap: number;
    enabled: boolean;
  };
  open_positions: Record<string, MarketPosition>;
  realized_pnl: number;
  unrealized_pnl: number;
  total_trades: number;
  profitable_trades: number;
  losing_trades: number;
  last_sync_at?: string | null;
};

export type MarketPosition = {
  market_id: string;
  outcome_id: string;
  price: number;
  size: number;
  side: string;
  opened_at: string;
  source_wallet?: string | null;
};

export type SummaryResponse = {
  wallets: WalletState[];
  total_positions: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_trades: number;
  profitable_trades: number;
  losing_trades: number;
};

export type LogEntry = {
  level: string;
  message: string;
  context?: string | null;
  timestamp: string;
};

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (error) {
    console.error(`Failed to fetch ${path}`, error);
    return null;
  }
}

async function getSummary(): Promise<SummaryResponse> {
  const fallback: SummaryResponse = {
    wallets: [],
    total_positions: 0,
    realized_pnl: 0,
    unrealized_pnl: 0,
    total_trades: 0,
    profitable_trades: 0,
    losing_trades: 0,
  };
  return (await fetchJson<SummaryResponse>("/summary")) ?? fallback;
}

async function getLogs(): Promise<LogEntry[]> {
  return (await fetchJson<LogEntry[]>("/logs")) ?? [];
}

export default async function Home() {
  const [summary, logs] = await Promise.all([getSummary(), getLogs()]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/5 bg-slate-950/80 px-8 py-5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Shadow control</p>
            <h1 className="text-2xl font-semibold text-white">Polymarket Copy Console</h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/40"
          >
            Refresh
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <SummaryStrip summary={summary} />
        <CompositeStats summary={summary} />

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="space-y-6">
            <WalletGrid wallets={summary.wallets} />
            <ShadowFeed wallets={summary.wallets} />
          </section>
          <LogsPanel logs={logs} />
        </div>
      </main>
    </div>
  );
}

function SummaryStrip({ summary }: { summary: SummaryResponse }) {
  const winRate = summary.total_trades
    ? Math.round((summary.profitable_trades / summary.total_trades) * 100)
    : 0;

  const cards = [
    { label: "Realized PnL", value: formatUsd(summary.realized_pnl) },
    { label: "Unrealized PnL", value: formatUsd(summary.unrealized_pnl) },
    { label: "Open positions", value: summary.total_positions },
    {
      label: "Win rate",
      value: summary.total_trades
        ? `${winRate}% (${summary.profitable_trades}/${summary.total_trades})`
        : "0%",
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl shadow-black/20"
        >
          <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
        </div>
      ))}
    </section>
  );
}

function CompositeStats({ summary }: { summary: SummaryResponse }) {
  const activeWallets = summary.wallets.filter((w) => w.wallet.enabled);
  const totalDailyCap = activeWallets.reduce(
    (acc, wallet) => acc + wallet.wallet.daily_loss_cap,
    0
  );
  const currentExposure = activeWallets.reduce(
    (acc, wallet) => acc + wallet.wallet.max_notional_per_trade,
    0
  );

  const cards = [
    { label: "Active wallets", value: activeWallets.length },
    { label: "Daily loss budget", value: formatUsd(totalDailyCap) },
    { label: "Max per-trade exposure", value: formatUsd(currentExposure) },
    { label: "Shadow mode", value: "ON" },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-sm text-indigo-100"
        >
          <p className="text-xs uppercase tracking-wide text-indigo-200/70">{card.label}</p>
          <p className="mt-2 text-lg font-semibold text-white">{card.value}</p>
        </div>
      ))}
    </section>
  );
}

function WalletGrid({ wallets }: { wallets: WalletState[] }) {
  if (!wallets.length) {
    return (
      <section className="rounded-3xl border border-dashed border-white/15 bg-slate-900/40 p-10 text-center text-slate-400">
        Configure wallets to start mirroring.
      </section>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      {wallets.map((wallet) => (
        <WalletCard key={wallet.wallet.address} wallet={wallet} />
      ))}
    </section>
  );
}

function WalletCard({ wallet }: { wallet: WalletState }) {
  const {
    description,
    copy_ratio,
    daily_loss_cap,
    max_notional_per_trade,
    stop_loss_pct,
    enabled,
  } = wallet.wallet;
  const winRate = wallet.total_trades
    ? Math.round((wallet.profitable_trades / wallet.total_trades) * 100)
    : 0;
  const formattedAddress = `${wallet.wallet.address.slice(0, 6)}...${wallet.wallet.address.slice(-4)}`;

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-lg shadow-black/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Source Wallet</p>
          <p className="font-mono text-sm text-slate-200">{formattedAddress}</p>
          {description && <p className="text-sm text-slate-400">{description}</p>}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            enabled ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-700 text-slate-400"
          }`}
        >
          {enabled ? "Active" : "Paused"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <Param label="Copy ratio" value={`${Math.round(copy_ratio * 100)}%`} />
        <Param label="Daily loss cap" value={formatUsd(daily_loss_cap)} />
        <Param label="Per-trade cap" value={formatUsd(max_notional_per_trade)} />
        <Param label="Stop loss" value={`${Math.round(stop_loss_pct * 100)}%`} />
        <Param label="Open positions" value={Object.keys(wallet.open_positions ?? {}).length.toString()} />
        <Param label="Last sync" value={wallet.last_sync_at ? new Date(wallet.last_sync_at).toLocaleTimeString() : "—"} />
      </div>

      <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 text-sm">
        <div className="flex items-center justify-between">
          <Stat label="Realized" value={formatUsd(wallet.realized_pnl)} />
          <Stat label="Unrealized" value={formatUsd(wallet.unrealized_pnl)} />
        </div>
        <div className="mt-3 flex items-center justify-between text-slate-400">
          <span>{wallet.total_trades} trades</span>
          <span>{winRate}% win ({wallet.profitable_trades}/{wallet.total_trades})</span>
        </div>
      </div>
    </div>
  );
}

function ShadowFeed({ wallets }: { wallets: WalletState[] }) {
  const events = wallets.flatMap((wallet) => {
    const address = wallet.wallet.address;
    const base = wallet.last_sync_at ? new Date(wallet.last_sync_at).toLocaleTimeString() : "Recently";
    return [
      {
        title: `Synced ${address.slice(0, 6)}...${address.slice(-4)}`,
        body: `${Object.keys(wallet.open_positions ?? {}).length} open positions, ${wallet.total_trades} trades`,
        timestamp: base,
      },
      {
        title: `PnL snapshot`,
        body: `Realized ${formatUsd(wallet.realized_pnl)} | Unrealized ${formatUsd(wallet.unrealized_pnl)}`,
        timestamp: base,
      },
    ];
  });

  if (!events.length) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-inner shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Sync activity</h2>
          <p className="text-sm text-slate-400">Latest cycle highlights</p>
        </div>
      </div>
      <ul className="space-y-3">
        {events.slice(0, 6).map((event, idx) => (
          <li key={`${event.title}-${idx}`} className="rounded-2xl border border-white/5 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between text-sm">
              <p className="font-semibold text-slate-200">{event.title}</p>
              <span className="text-xs text-slate-500">{event.timestamp}</span>
            </div>
            <p className="text-sm text-slate-400">{event.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LogsPanel({ logs }: { logs: LogEntry[] }) {
  return (
    <section className="rounded-3xl border border-amber-500/20 bg-slate-900/60 p-6 shadow-xl shadow-black/30">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Bot logs</h2>
        <p className="text-sm text-slate-400">Errors, warnings and sync notes</p>
      </div>
      <ul className="space-y-3">
        {logs.slice(0, 12).map((log, idx) => (
          <li key={idx} className="rounded-2xl border border-white/5 bg-slate-950/70 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${levelBadge(log.level)}`}
              >
                {log.level}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="mt-1 font-medium text-slate-200">{log.message}</p>
            {log.context && <p className="text-xs text-slate-500">{log.context}</p>}
          </li>
        ))}
        {!logs.length && (
          <li className="rounded-2xl border border-white/5 bg-slate-950/70 p-4 text-center text-sm text-slate-500">
            No bot messages yet.
          </li>
        )}
      </ul>
    </section>
  );
}

function Param({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-100">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function levelBadge(level: string) {
  switch (level) {
    case "WARN":
      return "bg-amber-500/20 text-amber-200 border border-amber-500/40";
    case "ERROR":
      return "bg-rose-500/20 text-rose-200 border border-rose-500/40";
    default:
      return "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40";
  }
}

function formatUsd(value: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return formatter.format(value);
}
