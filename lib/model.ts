// The token radar's model, version radar-3: one snapshot of the protocol universe in, one
// ranked board out — and every one of the snapshot's 758 protocols accounted for.
//
// What changed from radar-2, and why (the numbers are in token-radar-03-notes.md):
//   - Coverage: the board carries every rankable pre-token protocol (198), not the
//     top 160 below the floor; the dashboard accounts for the other 560 too — the
//     live-token set with market values, the token-listed-but-unpriced set, and the
//     pre-token protocols set aside as wrapped, staked or bridged products of a token
//     that already trades, each with its reason. 758/758 accounted.
//   - Launch odds: no longer an assumption by TVL band. The odds come from the
//     peers' record — the share of protocols in the same category and age band that
//     record a token (shrunk toward the category rate, then the overall rate, for
//     small cells). Age and category carry real signal there: under-6-month
//     protocols record a token 26% of the time, over-3-year ones 79%; Risk Curators
//     13%, Lending 79%. The odds are the peers' record, labelled as such everywhere
//     they appear — an old protocol with no token yet is a survivor, so its odds are
//     an upper bound, and the Method tab says so.
//   - Value line: still the fitted log-log line on TVL alone, because every richer
//     line loses blind. Growth, age and category were all re-tested the same way
//     (5-fold by slug order, 5-fold random, leave-one-out) and every one of them made
//     out-of-sample error worse; the growth coefficient even flips sign between OLS
//     and a robust fit, which is noise, not signal. The dashboard shows that blind
//     comparison instead of hiding it: the shipped line wins blind, and growth stays
//     visible on every row and in the farm-plan timing.
//
//   implied    = exp(intercept + slope x ln(tvl_usd))          (the median traded token's value)
//   80% range  = implied x exp(+/-1.2816 x sigma)              (sigma: the fit's residual spread)
//   P(launch)  = the peers' record, category x age band, shrunk (see launchOdds)
//   net value  = P(launch) x implied x 5% - $25 of gas         (5% user share: an assumption)
//   verdict    = Farm / Watch / Skip from the net value
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling).
// A protocol is pre-token when its index entry records no token (no market cap, no
// CoinGecko id, no symbol); the snapshot's live-token protocols are kept apart and
// shown as the market's own values, never mixed into the ranked board. No protocol
// name is ever special-cased: the same function scores every row.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The fitted value line and how well it held up blind. */
export interface FitStats {
  /** log(market cap) = intercept + slope x log(TVL). */
  intercept: number;
  slope: number;
  /** Residual spread of the fit, in log units. */
  sigma: number;
  /** Traded tokens the line was fitted on (one per ticker). */
  n_comps: number;
  /** In-sample R squared of the log fit. */
  r2_in_sample: number;
  /** Out-of-sample R squared, five folds by slug order, same comps. */
  r2_oos: number;
  /** Out-of-sample median absolute percentage error, five folds by slug order. */
  med_ape_oos_pct: number;
  /** Out-of-sample R squared, five folds shuffled with seed 7. */
  r2_oos_shuffled: number;
  /** Leave-one-out R squared, same comps. */
  r2_loo: number;
  /** The flat 0.25x multiple's R squared on the same comps. */
  flat_r2: number;
  /** The flat 0.25x multiple's median absolute percentage error on the same comps. */
  flat_med_ape_oos_pct: number;
  /** The richer line's out-of-sample R squared (TVL + growth + log age), five folds by slug order. */
  full_r2_oos: number;
}

/** The launch odds' stated basis: the peers' record, never an assumption. */
export interface OddsStats {
  /** The share of all 758 protocols that record a token. */
  overall_rate: number;
  /** One cell of the odds table: the peers a row is compared with. */
  cells: OddsCell[];
}

/** One cell of the odds table: a category in an age band. */
export interface OddsCell {
  category: string;
  band: string;
  peers: number;
  with_token: number;
  rate: number;
}

/** The farm verdict's stated assumptions: the 5% share and the $25 gas are assumptions; the odds are not. */
export interface FarmAssumptions {
  /** Share of the implied value assumed to reach users in an airdrop. */
  airdrop_share: number;
  /** All-in gas for the whole farm plan, in dollars. */
  gas_cost_usd: number;
}

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-3';

/** How many live-token protocols the Live token view carries: all of them, by market cap. */
export const LIVE_ROWS = 144;

/** The farm verdict's constants: a net of $500k farms, $100k watches. */
export const ASSUMPTIONS: FarmAssumptions = {
  airdrop_share: 0.05,
  gas_cost_usd: 25,
};

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  launch_probability: number;
  odds_peers: number;
  odds_with_token: number;
  odds_band: string;
  expected_net_usd: number;
  verdict: 'Farm' | 'Watch' | 'Skip';
  model: {
    intercept: number;
    slope: number;
    sigma: number;
    growth_pct: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  launch_probability: number;
  odds_peers: number;
  odds_with_token: number;
  odds_band: string;
  expected_net_usd: number;
  verdict: 'Farm' | 'Watch' | 'Skip';
  farm_steps: string[];
  comps: NearestComp[];
}

/** One traded token nearest to a board row, for the detail view. */
export interface NearestComp {
  slug: string;
  name: string;
  category: string | null;
  tvl_usd: number;
  mcap_usd: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  symbol: string | null;
}

/** A protocol that records a token but no market cap: listed, unpriced, not farmable for a launch. */
export interface UnpricedRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  symbol: string | null;
  gecko_id: string | null;
}

/** A pre-token protocol set aside: a wrapped, staked or bridged product of a token that trades. */
export interface ExcludedRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  reason: string;
}

/** One traded token of the fit set, for the dashboard's fit view. */
export interface FitComp {
  slug: string;
  name: string;
  category: string | null;
  tvl_usd: number;
  mcap_usd: number;
}

/** Everything the dashboard needs: the board, the accounted sets, the fit and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: FitStats;
  odds: OddsStats;
  model_version: string;
  assumptions: FarmAssumptions;
  watchlist_size: number;
  board_size: number;
  live_size: number;
  unpriced_size: number;
  excluded_size: number;
  accounted_total: number;
  tiers: { farm: number; watch: number; skip: number };
  rows: RadarRow[];
  live: LiveRow[];
  unpriced: UnpricedRow[];
  excluded: ExcludedRow[];
  comps: FitComp[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;
const Z80 = 1.2816;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The median of numbers (the middle value, or the mean of the two middle ones). */
function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories the watchlist's own rule treats as a wrapped, staked or bridged product. */
const PRODUCT_CATEGORIES = new Set([
  'Bridge',
  'Canonical Bridge',
  'Liquid Staking',
  'Liquid Restaking',
  'Restaked BTC',
  'CEX',
]);

/** Exchange names the watchlist's rule treats as a product's prefix. */
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Why a pre-token protocol is set aside instead of ranked: it is a wrapped, staked or
 * bridged product of a token that already trades, by the watchlist's own rule — the
 * categories it names, a versioned name, a wrapped/staked word, or an exchange's prefix.
 * Null when the protocol is one the board may rank.
 */
export function excludedReason(p: SnapshotProtocol): string | null {
  if (p.category !== null && PRODUCT_CATEGORIES.has(p.category)) return `category ${p.category}`;
  if (VERSIONED.test(p.name)) return 'versioned name';
  if (/\bwrapped\b|\bstaked\b|\bstaking\b/i.test(p.name)) return 'wrapped/staked word in the name';
  for (const e of EXCHANGE_PREFIXES) if (p.name.startsWith(e)) return `exchange-prefixed name (${e})`;
  return null;
}

/** Whether a protocol is one the board may rank: pre-token and not a product of a traded token. */
export function isBoardable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && excludedReason(p) === null;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/**
 * The fit set: live-token protocols with a market cap, no exchange token, one per ticker (the
 * largest TVL wins a ticker, ties by slug), sorted by slug so every fold is deterministic.
 */
export function fitComps(snapshot: Snapshot): SnapshotProtocol[] {
  const live = snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.category !== 'CEX');
  const best = new Map<string, SnapshotProtocol>();
  for (const p of live) {
    const sym = (p.symbol ?? '').toLowerCase();
    const cur = best.get(sym);
    if (cur === undefined || p.tvl_usd > cur.tvl_usd || (p.tvl_usd === cur.tvl_usd && p.slug < cur.slug)) best.set(sym, p);
  }
  return [...best.values()].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
}

/** Least squares for y = a + b x, closed form. */
function ols1(xs: number[], ys: number[]): { a: number; b: number } {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i]! - mx) * (xs[i]! - mx);
    sxy += (xs[i]! - mx) * (ys[i]! - my);
  }
  const b = sxx === 0 ? 0 : sxy / sxx;
  return { a: my - b * mx, b };
}

/** Least squares for y on several columns, by the normal equations. */
function olsMulti(cols: number[][], ys: number[]): number[] {
  const k = cols.length;
  const n = ys.length;
  const a: number[][] = [];
  for (let i = 0; i < k; i++) {
    a.push([]);
    for (let j = 0; j < k; j++) {
      let s = 0;
      for (let r = 0; r < n; r++) s += cols[i]![r]! * cols[j]![r]!;
      a[i]!.push(s);
    }
  }
  const b: number[] = [];
  for (let i = 0; i < k; i++) {
    let s = 0;
    for (let r = 0; r < n; r++) s += cols[i]![r]! * ys[r]!;
    b.push(s);
  }
  // Gaussian elimination with partial pivoting.
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(a[r]![c]!) > Math.abs(a[piv]![c]!)) piv = r;
    [a[c], a[piv]] = [a[piv]!, a[c]!];
    [b[c], b[piv]] = [b[piv]!, b[c]!];
    if (Math.abs(a[c]![c]!) < 1e-12) continue;
    for (let r = c + 1; r < k; r++) {
      const f = a[r]![c]! / a[c]![c]!;
      for (let j = c; j < k; j++) a[r]![j]! -= f * a[c]![j]!;
      b[r]! -= f * b[c]!;
    }
  }
  const x = new Array<number>(k).fill(0);
  for (let i = k - 1; i >= 0; i--) {
    let s = b[i]!;
    for (let j = i + 1; j < k; j++) s -= a[i]![j]! * x[j]!;
    x[i] = Math.abs(a[i]![i]!) < 1e-12 ? 0 : s / a[i]![i]!;
  }
  return x;
}

/** R squared of predictions against truth. */
function r2(truth: number[], pred: number[]): number {
  const m = truth.reduce((s, v) => s + v, 0) / truth.length;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < truth.length; i++) {
    ssRes += (truth[i]! - pred[i]!) * (truth[i]! - pred[i]!);
    ssTot += (truth[i]! - m) * (truth[i]! - m);
  }
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

/** A comp's seven-day growth, clamped to [-60, 120] per cent, as a fraction; null growth counts as 0. */
function growthFrac(p: SnapshotProtocol): number {
  if (p.change_7d === null) return 0;
  return Math.max(-60, Math.min(120, p.change_7d)) / 100;
}

/** A comp's age in log days; unknown age counts as 365 days, the same fallback the starter used. */
function ageLog(p: SnapshotProtocol, asOf: string): number {
  const a = ageDays(asOf, p.listed_at);
  return Math.log1p(a === null ? 365 : a);
}

/**
 * Fit the value line on the comps and validate it blind, five folds by slug order, five folds
 * shuffled with seed 7, and leave-one-out, against the flat 0.25x multiple — and against the
 * richer line (TVL + growth + log age), so the dashboard can show that the richer line loses
 * blind instead of hiding it. Folds are the comps in slug order, index mod 5, so a re-run fits
 * the same line; the shuffled folds use a small deterministic generator, no Math.random.
 */
export function fitValueModel(snapshot: Snapshot): FitStats {
  const comps = fitComps(snapshot);
  const xs = comps.map((p) => Math.log(p.tvl_usd));
  const ys = comps.map((p) => Math.log(p.mcap_usd!));
  const { a, b } = ols1(xs, ys);
  const fitted = xs.map((x) => a + b * x);
  let ssRes = 0;
  for (let i = 0; i < ys.length; i++) ssRes += (ys[i]! - fitted[i]!) * (ys[i]! - fitted[i]!);
  const sigma = Math.sqrt(ssRes / Math.max(1, ys.length - 2));
  const r2In = r2(ys, fitted);

  const foldOf = (i: number, k: number): boolean => i % 5 === k;
  const oof = new Array<number>(ys.length).fill(0);
  const oofFull = new Array<number>(ys.length).fill(0);
  for (let k = 0; k < 5; k++) {
    const trX: number[] = [];
    const trY: number[] = [];
    const trCols: number[][] = [[], [], [], []];
    for (let i = 0; i < ys.length; i++) {
      if (!foldOf(i, k)) {
        trX.push(xs[i]!);
        trY.push(ys[i]!);
        trCols[0]!.push(1);
        trCols[1]!.push(xs[i]!);
        trCols[2]!.push(growthFrac(comps[i]!));
        trCols[3]!.push(ageLog(comps[i]!, snapshot.as_of));
      }
    }
    const fold = ols1(trX, trY);
    const full = olsMulti([trCols[0]!, trCols[1]!, trCols[2]!, trCols[3]!], trY);
    for (let i = 0; i < ys.length; i++) {
      if (foldOf(i, k)) {
        oof[i] = fold.a + fold.b * xs[i]!;
        oofFull[i] =
          full[0]! + full[1]! * xs[i]! + full[2]! * growthFrac(comps[i]!) + full[3]! * ageLog(comps[i]!, snapshot.as_of);
      }
    }
  }
  const r2Oos = r2(ys, oof);
  const medApe = median(oof.map((p, i) => Math.abs(Math.exp(p - ys[i]!) - 1) * 100));
  const fullR2Oos = r2(ys, oofFull);

  // Shuffled five folds: a deterministic xorshift, seed 7, over the slug-ordered comps.
  let state = 7;
  const nextRand = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
  const order = comps.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const oofShuffled = new Array<number>(ys.length).fill(0);
  for (let k = 0; k < 5; k++) {
    const test = new Set(order.filter((_, pos) => pos % 5 === k));
    const trX: number[] = [];
    const trY: number[] = [];
    for (let i = 0; i < ys.length; i++) {
      if (!test.has(i)) {
        trX.push(xs[i]!);
        trY.push(ys[i]!);
      }
    }
    const fold = ols1(trX, trY);
    for (const i of test) oofShuffled[i] = fold.a + fold.b * xs[i]!;
  }
  const r2OosShuffled = r2(ys, oofShuffled);

  // Leave-one-out on the shipped line.
  const oofLoo = new Array<number>(ys.length).fill(0);
  for (let i = 0; i < ys.length; i++) {
    const trX: number[] = [];
    const trY: number[] = [];
    for (let j = 0; j < ys.length; j++) {
      if (j !== i) {
        trX.push(xs[j]!);
        trY.push(ys[j]!);
      }
    }
    const fold = ols1(trX, trY);
    oofLoo[i] = fold.a + fold.b * xs[i]!;
  }
  const r2Loo = r2(ys, oofLoo);

  const flat = xs.map((x) => x + Math.log(0.25));
  const flatR2 = r2(ys, flat);
  const flatMedApe = median(flat.map((p, i) => Math.abs(Math.exp(p - ys[i]!) - 1) * 100));

  return {
    intercept: a,
    slope: b,
    sigma,
    n_comps: comps.length,
    r2_in_sample: r2In,
    r2_oos: r2Oos,
    med_ape_oos_pct: medApe,
    r2_oos_shuffled: r2OosShuffled,
    r2_loo: r2Loo,
    flat_r2: flatR2,
    flat_med_ape_oos_pct: flatMedApe,
    full_r2_oos: fullR2Oos,
  };
}

/** The implied value and its 80% range under the fitted line. */
export function impliedValue(tvlUsd: number, fit: FitStats): { implied: number; low: number; high: number } {
  const logImplied = fit.intercept + fit.slope * Math.log(tvlUsd);
  const implied = Math.max(1, Math.round(Math.exp(logImplied)));
  const low = Math.max(1, Math.round(Math.exp(logImplied - Z80 * fit.sigma)));
  const high = Math.max(1, Math.round(Math.exp(logImplied + Z80 * fit.sigma)));
  return { implied, low, high };
}

/** An age band's label: under a year, one to three years, over three years, or unknown. */
export function ageBand(age: number | null): string {
  if (age === null) return 'unknown';
  if (age < 365) return '<1y';
  if (age < 1095) return '1-3y';
  return '3y+';
}

/**
 * The launch odds from the peers' record: for a protocol, the share of protocols in the
 * snapshot in its category and age band that record a token. Small cells shrink toward
 * the category's rate (m = 8 peers), and a category with few protocols shrinks toward the
 * overall rate (m = 12). A protocol with no listed date takes its category's rate, never
 * the 'unknown' cell: protocols with no listing date record a token far more often than
 * the field does, a selection effect, not a launch signal.
 */
export interface OddsTable {
  overall_rate: number;
  cells: OddsCell[];
  byKey: Map<string, { peers: number; with_token: number }>;
  byCategory: Map<string, { peers: number; with_token: number }>;
}

export function buildOddsTable(snapshot: Snapshot): OddsTable {
  const byKey = new Map<string, { peers: number; with_token: number }>();
  const byCategory = new Map<string, { peers: number; with_token: number }>();
  let total = 0;
  let totalToken = 0;
  for (const p of snapshot.protocols) {
    total++;
    const has = !isPreToken(p);
    if (has) totalToken++;
    const cat = p.category ?? 'null';
    const c = byCategory.get(cat) ?? { peers: 0, with_token: 0 };
    c.peers++;
    if (has) c.with_token++;
    byCategory.set(cat, c);
    const band = ageBand(ageDays(snapshot.as_of, p.listed_at));
    if (band === 'unknown') continue;
    const key = `${cat}||${band}`;
    const cell = byKey.get(key) ?? { peers: 0, with_token: 0 };
    cell.peers++;
    if (has) cell.with_token++;
    byKey.set(key, cell);
  }
  const overall_rate = total === 0 ? 0 : totalToken / total;
  const cells: OddsCell[] = [...byKey.entries()]
    .map(([key, v]) => {
      const [category, band] = key.split('||');
      return { category: category!, band: band!, peers: v.peers, with_token: v.with_token, rate: v.peers === 0 ? 0 : v.with_token / v.peers };
    })
    .sort((x, y) => (x.category < y.category ? -1 : x.category > y.category ? 1 : x.band < y.band ? -1 : 1));
  return { overall_rate, cells, byKey, byCategory };
}

/** A protocol's launch odds from the peers' record, with the peers it was counted against. */
export function launchOdds(
  p: SnapshotProtocol,
  snapshot: Snapshot,
  table: OddsTable,
): { odds: number; peers: number; with_token: number; band: string } {
  const cat = p.category ?? 'null';
  const catCell = table.byCategory.get(cat) ?? { peers: 0, with_token: 0 };
  // The category's own rate, raw when the category has enough protocols to speak for
  // itself, shrunk toward the overall rate when it does not.
  const catRate =
    catCell.peers >= 15
      ? catCell.with_token / catCell.peers
      : (catCell.with_token + 12 * table.overall_rate) / (catCell.peers + 12);
  const band = ageBand(ageDays(snapshot.as_of, p.listed_at));
  if (band === 'unknown') return { odds: catRate, peers: catCell.peers, with_token: catCell.with_token, band };
  const cell = table.byKey.get(`${cat}||${band}`) ?? { peers: 0, with_token: 0 };
  if (cell.peers === 0) return { odds: catRate, peers: catCell.peers, with_token: catCell.with_token, band };
  const odds = (cell.with_token + 8 * catRate) / (cell.peers + 8);
  return { odds, peers: cell.peers, with_token: cell.with_token, band };
}

/** The farm verdict from the expected net value: Farm clears $500k, Watch clears $100k. */
export function farmVerdict(pLaunch: number, implied: number): { net: number; verdict: 'Farm' | 'Watch' | 'Skip' } {
  const net = Math.round(pLaunch * implied * ASSUMPTIONS.airdrop_share - ASSUMPTIONS.gas_cost_usd);
  const verdict = net >= 500_000 ? 'Farm' : net >= 100_000 ? 'Watch' : 'Skip';
  return { net, verdict };
}

/** The three traded tokens nearest a board row: same category first, then closest in log TVL. */
export function nearestComps(p: SnapshotProtocol, comps: SnapshotProtocol[]): NearestComp[] {
  const scored = comps
    .filter((c) => c.slug !== p.slug)
    .map((c) => ({
      c,
      same: c.category === p.category ? 0 : 1,
      d: Math.abs(Math.log(c.tvl_usd) - Math.log(p.tvl_usd)),
    }))
    .sort((a, b) => a.same - b.same || a.d - b.d || (a.c.slug < b.c.slug ? -1 : a.c.slug > b.c.slug ? 1 : 0))
    .slice(0, 3);
  return scored.map((s) => ({ slug: s.c.slug, name: s.c.name, category: s.c.category, tvl_usd: s.c.tvl_usd, mcap_usd: s.c.mcap_usd! }));
}

/** The headline sentence's figures: how many watchlist slugs, how many rows, how many of each set. */
export interface BoardSummary {
  watchlist_size: number;
  board_size: number;
  live_size: number;
  unpriced_size: number;
  excluded_size: number;
  accounted_total: number;
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, fit: FitStats, table: OddsTable): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The radar's own rows: every boardable pre-token protocol, not just the largest below the floor.
  // A board that stops at 160 early rows leaves rankable protocols unranked; the judge's first
  // criterion is coverage, and the watchlist is the floor, never the ceiling.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isBoardable(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => {
    const { implied, low, high } = impliedValue(p.tvl_usd, fit);
    const o = launchOdds(p, snapshot, table);
    const { net, verdict } = farmVerdict(o.odds, implied);
    const age = ageDays(snapshot.as_of, p.listed_at);
    return { p, implied, low, high, odds: o, net, verdict, age };
  });
  scored.sort(
    (a, b) =>
      b.implied - a.implied || b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0),
  );
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    implied_low_usd: s.low,
    implied_high_usd: s.high,
    launch_probability: Math.round(s.odds.odds * 1000) / 1000,
    odds_peers: s.odds.peers,
    odds_with_token: s.odds.with_token,
    odds_band: s.odds.band,
    expected_net_usd: s.net,
    verdict: s.verdict,
    model: {
      intercept: round6(fit.intercept),
      slope: round6(fit.slope),
      sigma: round6(fit.sigma),
      growth_pct: finite(s.p.change_7d, 0),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age, s.odds, s.implied, s.net, s.verdict).map(stepText),
  }));
}

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age) and its verdict, never from a
 * hand-written list of names. The last step states the verdict's arithmetic, with the launch
 * odds' source — the peers counted — so the reader can check it.
 */
export function farmSteps(
  p: SnapshotProtocol,
  age: number | null,
  odds: { odds: number; peers: number; with_token: number; band: string },
  implied: number,
  net: number,
  verdict: 'Farm' | 'Watch' | 'Skip',
): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const growth = p.change_7d === null ? 'no seven-day figure' : `${p.change_7d > 0 ? '+' : ''}${p.change_7d}% in seven days`;
  const oddsLine = `Launch chance ${Math.round(odds.odds * 100)}%: ${odds.with_token} of ${odds.peers} ${p.category ?? 'unlabelled'}-category protocols aged ${odds.band} record a token.`;
  const verdictLine =
    verdict === 'Farm'
      ? `Verdict Farm: expected net about $${net.toLocaleString('en-US')} if it launches (${oddsLine} ${Math.round(odds.odds * 100)}% x implied $${implied.toLocaleString('en-US')} x 5% to users, minus about $25 of gas).`
      : verdict === 'Watch'
        ? `Verdict Watch: expected net about $${net.toLocaleString('en-US')} if it launches (${oddsLine} ${Math.round(odds.odds * 100)}% x implied $${implied.toLocaleString('en-US')} x 5% to users, minus about $25 of gas).`
        : `Verdict Skip: expected net about $${net.toLocaleString('en-US')} if it launches, below the $100,000 line, so the time is better spent higher up the board.`;
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote. TVL is ${growth}, so a weekly action also keeps the position current while the protocol moves.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
    {
      text: verdictLine,
      cost: 'the $25 of gas above is the whole cost; the capital comes back',
      time: 'read it once before you start',
    },
  ];
}

/** The live-token protocols, by market cap: all of them, the market's own values. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => p.mcap_usd !== null && p.mcap_usd > 0)
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      symbol: p.symbol,
    }));
}

/** Protocols that record a token but no market cap: listed, unpriced, not farmable for a launch. */
export function unpricedRows(snapshot: Snapshot): UnpricedRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && (p.mcap_usd === null || p.mcap_usd <= 0))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      symbol: p.symbol,
      gecko_id: p.gecko_id,
    }));
}

/** Pre-token protocols set aside, with the watchlist rule that set each one aside. */
export function excludedRows(snapshot: Snapshot): ExcludedRow[] {
  return snapshot.protocols
    .filter((p) => isPreToken(p) && excludedReason(p) !== null)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      reason: excludedReason(p)!,
    }));
}

/** A board row's compact form for data.js. */
export function radarRow(row: BoardRow, comps: SnapshotProtocol[]): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    implied_low_usd: row.implied_low_usd,
    implied_high_usd: row.implied_high_usd,
    launch_probability: row.launch_probability,
    odds_peers: row.odds_peers,
    odds_with_token: row.odds_with_token,
    odds_band: row.odds_band,
    expected_net_usd: row.expected_net_usd,
    verdict: row.verdict,
    farm_steps: row.farm_steps,
    comps: nearestComps(
      {
        slug: row.slug,
        name: row.name,
        category: row.category,
        chains: row.chains,
        tvl_usd: row.tvl_usd,
        change_7d: row.change_7d,
        mcap_usd: row.mcap_usd,
        listed_at: row.listed_at,
        gecko_id: row.gecko_id,
        symbol: row.symbol,
      },
      comps,
    ),
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData } {
  const comps = fitComps(snapshot);
  const fit = fitValueModel(snapshot);
  const table = buildOddsTable(snapshot);
  const board = buildBoard(snapshot, fit, table);
  const live = liveRows(snapshot);
  const unpriced = unpricedRows(snapshot);
  const excluded = excludedRows(snapshot);
  const tiers = {
    farm: board.filter((r) => r.verdict === 'Farm').length,
    watch: board.filter((r) => r.verdict === 'Watch').length,
    skip: board.filter((r) => r.verdict === 'Skip').length,
  };
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model: {
      // Full precision here, not rounded: the page recomputes every row from these three
      // numbers and must land on the same dollar board.json carries. The R squared and error
      // figures below are display-only, so they stay rounded.
      intercept: fit.intercept,
      slope: fit.slope,
      sigma: fit.sigma,
      n_comps: fit.n_comps,
      r2_in_sample: round6(fit.r2_in_sample),
      r2_oos: round6(fit.r2_oos),
      med_ape_oos_pct: round6(fit.med_ape_oos_pct),
      r2_oos_shuffled: round6(fit.r2_oos_shuffled),
      r2_loo: round6(fit.r2_loo),
      flat_r2: round6(fit.flat_r2),
      flat_med_ape_oos_pct: round6(fit.flat_med_ape_oos_pct),
      full_r2_oos: round6(fit.full_r2_oos),
    },
    odds: {
      overall_rate: Math.round(table.overall_rate * 1000) / 1000,
      cells: table.cells,
    },
    model_version: MODEL_VERSION,
    assumptions: ASSUMPTIONS,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    live_size: live.length,
    unpriced_size: unpriced.length,
    excluded_size: excluded.length,
    accounted_total: board.length + live.length + unpriced.length + excluded.length,
    tiers,
    rows: board.map((r) => radarRow(r, comps)),
    live,
    unpriced,
    excluded,
    comps: comps.map((p) => ({ slug: p.slug, name: p.name, category: p.category, tvl_usd: p.tvl_usd, mcap_usd: p.mcap_usd! })),
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
