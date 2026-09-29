# Stackwatch

Dollars or stocks, on chain. A simulated deposit ("no wallet needed") with live numbers:

- dollar yields and the 3-month T-bill from Ratewatch (`/api/rates`)
- stock tokens on Robinhood Chain from Pegwatch (`/api/board`)
- each stock's last 7 days from Tidewatch (`/api/stock-history`)

`api/data.js` reads those three public endpoints and serves one small answer, cached 5 minutes at the CDN.
The page is static: `index.html`, `styles.css`, `app.js`. No wallet, no contracts, no custody.
The source URLs can be changed with the env vars `RATES_URL`, `BOARD_URL` and `HISTORY_URL`.
