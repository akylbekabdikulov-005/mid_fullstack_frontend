import { useCallback, useEffect, useMemo, useState } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import { buyShares, createStock, fetchMyStock, fetchPortfolio, fetchStocks, updateStockPrice } from '../services/api';

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState({ walletBalance: 0, holdings: [] });
  const [stocks, setStocks] = useState([]);
  const [myStock, setMyStock] = useState(null);
  const [prices, setPrices] = useState({});
  const [error, setError] = useState('');
  const [tickerInput, setTickerInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [buyTicker, setBuyTicker] = useState('');
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [connectionLabel, setConnectionLabel] = useState('connecting');

  const handleSocketMessage = useCallback((message) => {
    if (message.type !== 'TICKER_UPDATE') {
      return;
    }
    setPrices((prev) => ({ ...prev, [message.payload.ticker]: message.payload.price }));
  }, []);

  const socketStatus = useWebSocket(localStorage.getItem('pex_token'), handleSocketMessage);

  useEffect(() => {
    setConnectionLabel(socketStatus);
  }, [socketStatus]);

  useEffect(() => {
    async function loadData() {
      try {
        const [portfolioResponse, stocksResponse, myStockResponse] = await Promise.all([
          fetchPortfolio(),
          fetchStocks(),
          fetchMyStock()
        ]);

        setPortfolio(portfolioResponse);
        setStocks(stocksResponse.stocks);
        setMyStock(myStockResponse.stock);

        const initialPrices = stocksResponse.stocks.reduce((map, stock) => {
          map[stock.ticker] = stock.price;
          return map;
        }, {});
        setPrices(initialPrices);
        setBuyTicker(stocksResponse.stocks[0]?.ticker || '');
      } catch (err) {
        setError(err.message);
      }
    }

    loadData();
  }, []);

  const totalValuation = useMemo(() => {
    const holdingsValue = portfolio.holdings.reduce((sum, item) => {
      const currentPrice = prices[item.ticker] ?? item.currentPrice ?? 0;
      return sum + item.sharesOwned * currentPrice;
    }, 0);
    return portfolio.walletBalance + holdingsValue;
  }, [portfolio, prices]);

  const submitBuy = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await buyShares(buyTicker, Number(buyQuantity));
      setPortfolio((prev) => {
        const existing = prev.holdings.find((item) => item.ticker === response.ticker);
        const updatedHoldings = existing
          ? prev.holdings.map((item) =>
              item.ticker === response.ticker
                ? { ...item, sharesOwned: response.sharesOwned }
                : item
            )
          : [...prev.holdings, { ticker: response.ticker, sharesOwned: response.sharesOwned, currentPrice: prices[response.ticker] || 0 }];

        return {
          ...prev,
          walletBalance: response.walletBalance,
          holdings: updatedHoldings
        };
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const submitCreateStock = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await createStock(tickerInput, Number(priceInput));
      setMyStock(response.stock);
      setStocks((prev) => [...prev, response.stock]);
      setPrices((prev) => ({ ...prev, [response.stock.ticker]: response.stock.price }));
      setTickerInput('');
      setPriceInput('');
    } catch (err) {
      setError(err.message);
    }
  };

  const submitUpdatePrice = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await updateStockPrice(myStock.ticker, Number(priceInput));
      setMyStock(response.stock);
      setStocks((prev) => prev.map((stock) => (stock.ticker === response.stock.ticker ? response.stock : stock)));
      setPrices((prev) => ({ ...prev, [response.stock.ticker]: response.stock.price }));
      setPriceInput('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dashboard-grid">
      <section className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Portfolio Summary</h2>
            <p>Wallet balance: ${portfolio.walletBalance.toFixed(2)}</p>
            <p>Total net worth: ${totalValuation.toFixed(2)}</p>
          </div>
          <div className="status-pill">WebSocket: {connectionLabel}</div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <h3>Holdings</h3>
        <table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Shares</th>
              <th>Price</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.holdings.map((item) => {
              const currentPrice = prices[item.ticker] ?? item.currentPrice ?? 0;
              return (
                <tr key={item.ticker}>
                  <td>{item.ticker}</td>
                  <td>{item.sharesOwned}</td>
                  <td>${currentPrice.toFixed(2)}</td>
                  <td>${(item.sharesOwned * currentPrice).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="section-card">
        <h2>Market</h2>
        <table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => (
              <tr key={stock.ticker}>
                <td>{stock.ticker}</td>
                <td>${(prices[stock.ticker] ?? stock.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section-card">
        <h2>Buy Shares</h2>
        <form onSubmit={submitBuy}>
          <div className="form-group">
            <label>Choose ticker</label>
            <select value={buyTicker} onChange={(e) => setBuyTicker(e.target.value)}>
              {stocks.map((stock) => (
                <option key={stock.ticker} value={stock.ticker}>
                  {stock.ticker}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input type="number" value={buyQuantity} min="1" onChange={(e) => setBuyQuantity(Number(e.target.value))} required />
          </div>
          <button type="submit">Buy shares</button>
        </form>
      </section>

      <section className="section-card">
        <h2>{myStock ? 'Update Your Stock Price' : 'Create Your Ticker'}</h2>
        <form onSubmit={myStock ? submitUpdatePrice : submitCreateStock}>
          {!myStock && (
            <div className="form-group">
              <label>Ticker symbol</label>
              <input value={tickerInput} onChange={(e) => setTickerInput(e.target.value)} placeholder="DEV" required />
            </div>
          )}
          <div className="form-group">
            <label>Price</label>
            <input type="number" value={priceInput} min="0" step="0.01" onChange={(e) => setPriceInput(e.target.value)} required />
          </div>
          <button type="submit">{myStock ? 'Update price' : 'Create ticker'}</button>
        </form>
        {myStock && (
          <p style={{ marginTop: 12 }}>
            Current owned ticker: <strong>{myStock.ticker}</strong> at ${myStock.price.toFixed(2)}
          </p>
        )}
      </section>
    </div>
  );
}
