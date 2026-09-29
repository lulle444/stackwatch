# Builds the static pages from src/: one shared head (with the menu) and footer around each page's own body.
# Run after editing anything in src/, styles.css or app.js:  python3 build.py
import hashlib, os
ROOT = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(ROOT, p), encoding="utf-8").read()
V = hashlib.sha1((rd("styles.css") + rd("app.js")).encode()).hexdigest()[:10]

MENU = [("/", "Try a deposit"), ("/dollars", "Dollars"), ("/stocks", "Stocks"), ("/how", "How it works")]
PAGES = [
    ("index.html", "/", "home.html", "Stackwatch · Dollars or stocks, on chain",
     "Try a deposit, no wallet needed: see what a dollar earns on chain next to the T-bill rate, and what a stock token on Robinhood Chain gets you. Live numbers, simulated deposits."),
    ("dollars.html", "/dollars", "dollars.html", "Dollar yields vs the T-bill · Stackwatch",
     "What a dollar earns on chain: T-bill funds, savings rates, synthetic dollars and lending, each held against the 3-month T-bill."),
    ("stocks.html", "/stocks", "stocks.html", "Stock tokens on Robinhood Chain · Stackwatch",
     "Stock tokens on Robinhood Chain: on-chain price, gap to the real share, the last 7 days and market depth."),
    ("how.html", "/how", "how.html", "How it works · Stackwatch",
     "Stackwatch is a simulator, not a vault: how the numbers are worked out, and the risks to know before moving real money."),
]
head, foot = rd("src/head.html"), rd("src/foot.html")
for out, path, body, title, desc in PAGES:
    nav = "".join(f'<a href="{h}"{" class=on aria-current=page" if h == path else ""}>{t}</a>' for h, t in MENU)
    pre = '<link rel="preload" href="/api/data" as="fetch" crossorigin>' if path != "/how" else ""
    html = head.replace("{title}", title).replace("{desc}", desc).replace("{nav}", nav).replace("{preload}", pre).replace("{v}", V)
    open(os.path.join(ROOT, out), "w", encoding="utf-8").write(html + rd("src/" + body) + foot.replace("{v}", V))
print("built", len(PAGES), "pages, v=" + V)
