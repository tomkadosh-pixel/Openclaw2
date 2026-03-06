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

async function getSummary(): Promise<SummaryResponse | null> {
  try {
    const res = await fetch(`${API_URL}/summary`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as SummaryResponse;
  } catch (error) {
    console.error("Failed to fetch summary", error);
    return null;
  }
}

export default async function Home() {
  const summary =
    (await getSummary()) ?? ({
      wallets: [],
      total_positions: 0,
      realized_pnl: 0,
      unrealized_pnl: 0,
      total_trades: 0,
      profitable_trades: 0,
      losing_trades: 0,
    } as SummaryResponse);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Master Account
            </p>
            <h1 className="text-xl font-semibold">Polymarket Copy Console</h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Refresh
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <SummaryStrip summary={summary} />
        <CompositeStats summary={summary} />
        <WalletGrid wallets={summary.wallets} />
        <ShadowFeed wallets={summary.wallets} />
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
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
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
    { label: "Shadow Mode", value: "ON" },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {card.label}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{card.value}</p>
        </div>
      ))}
    </section>
  );
}

function WalletGrid({ wallets }: { wallets: WalletState[] }) {
  if (!wallets.length) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
        Configure wallets to start mirroring.
      </section>
    );
  }

  return (
    <section className="grid gap-5 md:grid-cols-2">
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
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Source Wallet</p>
          <p className="font-mono text-sm text-slate-900">{formattedAddress}</p>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
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

      <div className="rounded-2xl bg-slate-50 p-4 text-sm">
        <div className="flex items-center justify-between">
          <Stat label="Realized" value={formatUsd(wallet.realized_pnl)} />
          <Stat label="Unrealized" value={formatUsd(wallet.unrealized_pnl)} />
        </div>
        <div className="mt-3 flex items-center justify-between text-slate-600">
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
        title: `Sync ${address.slice(0, 6)}...${address.slice(-4)}`,
        body: `${Object.keys(wallet.open_positions ?? {}).length} open positions, ${wallet.total_trades} total trades`,
        timestamp: base,
      },
      {
        title: `PnL update`,
        body: `Realized ${formatUsd(wallet.realized_pnl)} | Unrealized ${formatUsd(wallet.unrealized_pnl)}`,
        timestamp: base,
      },
    ];
  });

  if (!events.length) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Shadow feed</h2>
          <p className="text-sm text-slate-500">Latest mirror cycle summaries</p>
        </div>
      </div>
      <ul className="space-y-3">
        {events.slice(0, 6).map((event, idx) => (
          <li key={`${event.title}-${idx}`} className="rounded-2xl border border-slate-100 p-3">
            <div className="flex items-center justify-between text-sm">
              <p className="font-semibold text-slate-800">{event.title}</p>
              <span className="text-xs text-slate-500">{event.timestamp}</span>
            </div>
            <p className="text-sm text-slate-600">{event.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Param({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function formatUsd(value: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return formatter.format(value);
}
