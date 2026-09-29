// Everything the page needs, in one small answer: dollar yields from Ratewatch and stock tokens on Robinhood Chain from
// Pegwatch, with each stock's last 7 days from Tidewatch. The three sister sites already do the hard work; this reads
// their public endpoints, keeps what the simulator uses and caches it at Vercel's CDN for five minutes.
const SRC = {
  rates: process.env.RATES_URL || "https://ratewatch-lemon.vercel.app/api/rates",
  board: process.env.BOARD_URL || "https://usepegwatch.vercel.app/api/board",
  hist: process.env.HISTORY_URL || "https://www.usetidewatch.org/api/stock-history?symbol=",
};
const THIN = 10000;       // stock markets shallower than this move on small trades: left out
const DAY = 864e5;

async function get(url, ms){
  const r = await fetch(url, {headers: {accept: "application/json", "user-agent": "stackwatch/1.0"}, signal: AbortSignal.timeout(ms)});
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`);
  return r.json();
}

// Dollars: the four types from safest to riskiest, each with its median and its six largest yields
function dollars(b){
  const label = r => r.symbol && !r.name.toLowerCase().includes(r.symbol.toLowerCase()) ? `${r.name} ${r.symbol}` : r.name;
  const pick = r => ({name: label(r), symbol: r.symbol, apy: r.apy30 != null ? +r.apy30.toFixed(2) : null, tvl: Math.round(r.tvl), chains: r.chains, slug: r.slug});
  return {
    tbill: b.tbill,
    count: b.rows.length, tvl: Math.round(b.tvl),
    cats: b.cats.map(c => ({id: c.id, name: c.name, short: c.short, about: c.about, count: c.count, tvl: Math.round(c.tvl),
      median: c.median != null ? +c.median.toFixed(2) : null,
      options: b.rows.filter(r => r.cat === c.id && r.apy30 != null).slice(0, 6).map(pick)})),
  };
}

// Stocks: the Robinhood Chain version of each stock, deepest market first
function stocks(b){
  const out = [];
  for (const s of b.stocks || []){
    const v = (s.versions || []).find(x => x.chain === "robinhood" && x.issuer === "robinhood");
    if (!v || !v.onchain || v.halted || !(v.liquidity >= THIN)) continue;
    out.push({ticker: s.ticker, sym: v.symbol, name: s.name, logo: s.logo || null, price: v.onchain, share: s.ref, mult: v.multiplier || 1,
      gap: v.gap, liquidity: Math.round(v.liquidity), volume: v.volume24h != null ? Math.round(v.volume24h) : null, url: v.url});
  }
  return out.sort((a, b) => b.liquidity - a.liquidity).slice(0, 16);
}

// The on-chain price a week ago against the latest, from Tidewatch's hourly readings ([ms, gap, share, on-chain])
async function week(list){
  const now = Date.now();
  await Promise.all(list.map(async s => {
    try {
      const pts = ((await get(SRC.hist + encodeURIComponent(s.sym || s.ticker), 5000)).points || []).filter(p => p[3] > 0);
      if (pts.length < 2) return;
      const last = pts[pts.length - 1], first = pts.find(p => p[0] >= now - 7 * DAY);
      if (!first || last[0] - first[0] < 5 * DAY) return;
      s.week = {from: first[0], change: last[3] / first[3] - 1};
    } catch (e) { /* no week for this one */ }
  }));
}

module.exports = async (req, res) => {
  const t0 = Date.now();
  const [r, p] = await Promise.allSettled([get(SRC.rates, 20000), get(SRC.board, 20000)]);
  const out = {updated: new Date().toISOString(), errors: []};
  if (r.status === "fulfilled") out.dollars = dollars(r.value); else out.errors.push("rates: " + r.reason.message);
  if (p.status === "fulfilled"){ out.stocks = stocks(p.value); await week(out.stocks); } else out.errors.push("stocks: " + p.reason.message);
  out.ms = Date.now() - t0;
  const ok = out.dollars || out.stocks;
  res.setHeader("cache-control", ok ? "public, s-maxage=300, stale-while-revalidate=1800" : "no-store");
  res.status(ok ? 200 : 502).json(out);
};
