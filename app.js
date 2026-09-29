// Stackwatch: the simulated deposit, the dollar cards and the stock table, all from /api/data.
(function(){
  const $ = id => document.getElementById(id);
  const S = {data: null, amount: 1000, mix: 70, cat: "tbill", y: -1, stock: null};

  const usd = (x, d) => "$" + x.toLocaleString("en-US", {minimumFractionDigits: d ?? (Math.abs(x) < 1000 ? 2 : 0), maximumFractionDigits: d ?? (Math.abs(x) < 1000 ? 2 : 0)});
  const big = x => x >= 1e9 ? "$" + (x / 1e9).toFixed(1) + "B" : x >= 1e6 ? "$" + (x / 1e6).toFixed(0) + "M" : x >= 1e3 ? "$" + (x / 1e3).toFixed(0) + "K" : "$" + Math.round(x);
  const pct = (x, d = 2) => x.toFixed(d) + "%";
  const sgn = (x, d = 2) => (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(d);
  const px = x => "$" + (x >= 100 ? x.toFixed(2) : x >= 1 ? x.toFixed(3) : x.toPrecision(3));
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[c]);
  const SHORT = {tbill: "T-bill funds", savings: "Savings", synthetic: "Synthetic", lending: "Lending"};

  // ---- inputs
  const amt = $("amt");
  function setAmount(a, fromInput){
    S.amount = Math.max(0, Math.min(1e9, a || 0));
    if (!fromInput) amt.value = S.amount.toLocaleString("en-US");
    document.querySelectorAll("#amtChips button").forEach(b => b.classList.toggle("on", +b.dataset.a === S.amount));
    draw();
  }
  amt.addEventListener("input", () => setAmount(parseFloat(amt.value.replace(/[^0-9.]/g, "")), true));
  amt.addEventListener("blur", () => { amt.value = S.amount.toLocaleString("en-US"); });
  $("amtChips").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setAmount(+b.dataset.a); });
  const mix = $("mix");
  mix.addEventListener("input", () => { S.mix = +mix.value; draw(); });
  $("cats").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ S.cat = b.dataset.c; S.y = -1; fillYields(); draw(); } });
  $("yield").addEventListener("change", e => { S.y = +e.target.value; draw(); });
  $("stks").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ S.stock = b.dataset.t; draw(); } });

  function cat(){ const d = S.data && S.data.dollars; return d ? d.cats.find(c => c.id === S.cat) || d.cats[0] : null; }
  function fillYields(){
    const c = cat(); if (!c) return;
    $("cats").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.c === S.cat));
    $("yield").innerHTML = `<option value="-1">Median of ${c.count} ${esc(c.name)} · ${pct(c.median)}</option>` +
      c.options.map((o, i) => `<option value="${i}">${esc(o.name)} · ${pct(o.apy)} · ${big(o.tvl)}</option>`).join("");
    $("yield").value = String(S.y);
  }

  // ---- the result
  function draw(){
    mix.style.setProperty("--p", S.mix + "%");
    $("pD").textContent = S.mix + "%"; $("pS").textContent = (100 - S.mix) + "%";
    $("pickD").hidden = S.mix === 0; $("pickS").hidden = S.mix === 100;
    $("stks").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.t === S.stock));
    const d = S.data; if (!d) return;
    const aD = S.amount * S.mix / 100, aS = S.amount - aD;
    let h = "", earn = 0, known = true;

    if (aD > 0){
      const c = cat(), tb = d.dollars && d.dollars.tbill;
      if (!c) h += `<div class="leg"><p>Dollar yields are not loading right now.</p></div>`;
      else {
        const o = S.y >= 0 ? c.options[S.y] : null, r = o ? o.apy : c.median, year = aD * r / 100;
        earn += year;
        let vs = "";
        if (tb){
          const t = aD * tb.rate / 100, diff = year - t;
          vs = `<p>A 3-month T-bill at ${pct(tb.rate)} would pay ${usd(t)}. That's <strong class="${diff >= 0 ? "pos" : "neg"}">${usd(Math.abs(diff))} ${diff >= 0 ? "more" : "less"}</strong>${diff >= 0 ? ", paid for with risk" : ""}.</p>`;
        }
        h += `<div class="leg"><div class="leg-h"><span><i class="dot d"></i>${usd(aD)} in ${esc(o ? o.name : c.name)}</span><b class="pos">+${usd(year)}/yr</b></div>
          <p>At ${pct(r)} a year${o ? "" : ", the median of " + esc(c.name)}, if the rate holds. ${esc(c.short || "")}</p>${vs}</div>`;
      }
    }
    if (aS > 0){
      const s = (d.stocks || []).find(x => x.ticker === S.stock);
      if (!s) h += `<div class="leg"><p>Stock prices are not loading right now.</p></div>`;
      else {
        const n = aS / s.price, shares = n * s.mult;
        known = false;
        const gap = s.gap != null ? `The token trades <strong class="${Math.abs(s.gap) < 0.005 ? "" : s.gap > 0 ? "neg" : "pos"}">${pct(Math.abs(s.gap * 100))} ${s.gap >= 0 ? "above" : "below"}</strong> the real share (${px(s.share)}).` : "";
        const wk = s.week ? ` Over the last 7 days it moved <strong class="${s.week.change >= 0 ? "pos" : "neg"}">${sgn(s.week.change * 100)}%</strong>: ${usd(aS)} a week ago would be ${usd(aS * (1 + s.week.change))} now.` : "";
        h += `<div class="leg"><div class="leg-h"><span><i class="dot s"></i>${usd(aS)} in ${esc(s.ticker)}</span><b>${n >= 1 ? n.toFixed(3) : n.toPrecision(3)} ${esc(s.ticker)}</b></div>
          <p>At ${px(s.price)} on Robinhood Chain${Math.abs(s.mult - 1) > 1e-6 ? `, where one token stands for ${s.mult.toFixed(4)} shares (${shares.toPrecision(4)} shares)` : ""}. ${gap}${wk}</p>
          <p>It pays no rate. If ${esc(s.ticker)} moves 10%, this part moves about ${usd(aS * 0.1)}.</p></div>`;
      }
    }
    h += `<div class="total"><span>Your stack</span><b>${usd(S.amount, 0)}</b></div>`;
    h += `<p class="note">${aD > 0 ? `Dollars earn about ${usd(earn)} a year at today's rates. ` : ""}${known ? "" : "The stock part moves with the share. "}Simulated with live numbers. Not financial advice.</p>`;
    $("out").innerHTML = h;
  }

  // ---- sections
  function sections(d){
    const D = d.dollars, tb = D && D.tbill;
    if (D){
      $("stTbill").textContent = tb ? pct(tb.rate) : "–";
      $("stYields").textContent = String(D.count);
      $("cats").innerHTML = D.cats.map(c => `<button data-c="${c.id}">${SHORT[c.id] || esc(c.name)}</button>`).join("");
      $("catCards").innerHTML = (tb ? `<div class="bench" style="grid-column:1/-1"><i></i>3-month T-bill: ${pct(tb.rate)} <span style="color:var(--muted);font-weight:500">(${esc(tb.source)}, ${esc(tb.date)})</span></div>` : "") +
        D.cats.map(c => { const o = tb && c.median != null ? c.median - tb.rate : null;
          return `<div class="cat"><h3>${esc(c.name)}</h3><div class="r">${c.median != null ? pct(c.median) : "–"}</div>
          ${o != null ? `<div class="vs ${o >= 0 ? "pos" : "neg"}">${sgn(o)} pts vs T-bill</div>` : ""}
          <p>${c.count} yields · ${big(c.tvl)} deposited</p>
          <div class="top">${c.options.slice(0, 3).map(x => `<div>${esc(x.name)}<span>${pct(x.apy)}</span></div>`).join("")}</div></div>`; }).join("");
      $("catCards").style.cssText = "";
    }
    const st = d.stocks || [];
    $("stStocks").textContent = st.length ? String(st.length) : "–";
    if (st.length){
      if (!S.stock) S.stock = st[0].ticker;
      $("stks").innerHTML = st.slice(0, 8).map(s => `<button data-t="${esc(s.ticker)}">${esc(s.ticker)}</button>`).join("");
      $("stkRows").innerHTML = st.map(s => `<tr><td><span class="tk">${esc(s.ticker)}</span><span class="nm">${esc(s.name)}</span></td>
        <td class="n">${px(s.price)}</td>
        <td class="n">${s.gap != null ? `<span class="${Math.abs(s.gap) < 0.005 ? "" : s.gap > 0 ? "neg" : "pos"}">${sgn(s.gap * 100)}%</span>` : "–"}</td>
        <td class="n">${s.week ? `<span class="${s.week.change >= 0 ? "pos" : "neg"}">${sgn(s.week.change * 100)}%</span>` : "–"}</td>
        <td class="n hide-s">${big(s.liquidity)}</td></tr>`).join("");
    } else $("stkRows").innerHTML = `<tr><td colspan="5" class="skel">Stock prices are not loading right now.</td></tr>`;
    // the tape along the top
    const items = [];
    if (tb) items.push(`3-month T-bill<b>${pct(tb.rate)}</b>`);
    if (D) for (const c of D.cats) if (c.median != null) items.push(`${esc(c.name)}<b class="g">${pct(c.median)}</b>`);
    for (const s of st.slice(0, 6)) items.push(`${esc(s.ticker)} on chain<b>${px(s.price)}</b>`);
    if (D) items.push(`Deposited<b>${big(D.tvl)}</b>`);
    if (items.length){ const one = items.map(x => `<span>${x}</span>`).join(""); $("tape").innerHTML = one + one; }
    $("upd").textContent = "Numbers updated " + new Date(d.updated).toUTCString().replace(" GMT", " UTC");
  }

  fetch("/api/data").then(r => r.json()).then(d => {
    S.data = d; sections(d); fillYields(); draw();
  }).catch(() => { $("out").innerHTML = `<div class="skel">Today's numbers are not loading. Try again in a minute.</div>`; });
  draw();
})();
