import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type WalletState = {
  wallet: {
    address: string;
    allocation_pct: number;
    max_notional_per_trade: number;
    stop_loss_pct: number;
    enabled: boolean;
  };
  open_positions: Record<string, MarketPosition>;
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
};

async function getSummary(): Promise<SummaryResponse | null> {
  try {
    const res = await fetch(`${API_URL}/summary`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as SummaryResponse;
    return data;
  } catch (error) {
    console.error("Failed to fetch summary", error);
    return null;
  }
}

export default async function Home() {
  const summary = (await getSummary()) ?? { wallets: [], total_positions: 0 };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Polymarket Copy Dashboard</h1>
          <Link
            href="/"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Refresh
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tracked wallets" value={summary.wallets.length} />
          <StatCard label="Mirrored positions" value={summary.total_positions} />
          <StatCard
            label="Active wallets"
            value={summary.wallets.filter((w) => w.wallet.enabled).length}
          />
          <StatCard label="Shadow mode" value="ON" highlight />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Wallet monitor</h2>
              <p className="text-sm text-slate-500">
                Allocation / caps / open trades per wallet
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-4 py-2 font-medium">Wallet</th>
                  <th className="px-4 py-2 font-medium">Allocation</th>
                  <th className="px-4 py-2 font-medium">Max notional</th>
                  <th className="px-4 py-2 font-medium">Stop loss</th>
                  <th className="px-4 py-2 font-medium">Open positions</th>
                  <th className="px-4 py-2 font-medium">Last sync</th>
                </tr>
              </thead>
              <tbody>
                {summary.wallets.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-400" colSpan={6}>
                      No wallets configured yet.
                    </td>
                  </tr>
                ) : (
                  summary.wallets.map((wallet) => (
                    <WalletRow key={wallet.wallet.address} wallet={wallet} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${
        highlight ? "border-indigo-300" : ""
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function WalletRow({ wallet }: { wallet: WalletState }) {
  const openPositions = Object.values(wallet.open_positions ?? {});
  const formattedAddress = `${wallet.wallet.address.slice(0, 6)}...${wallet.wallet.address.slice(-4)}`;

  return (
    <tr className="border-t border-slate-100 text-slate-700">
      <td className="px-4 py-3 font-mono text-xs">{formattedAddress}</td>
      <td className="px-4 py-3">{(wallet.wallet.allocation_pct * 100).toFixed(1)}%</td>
      <td className="px-4 py-3">
        {`$${wallet.wallet.max_notional_per_trade.toFixed(0)}`}
      </td>
      <td className="px-4 py-3">{(wallet.wallet.stop_loss_pct * 100).toFixed(1)}%</td>
      <td className="px-4 py-3">{openPositions.length}</td>
      <td className="px-4 py-3 text-slate-500">
        {wallet.last_sync_at ? new Date(wallet.last_sync_at).toLocaleTimeString() : "—"}
      </td>
    </tr>
  );
}
