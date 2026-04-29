const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || 'Server error');
  }
  return payload;
}

function authHeaders() {
  const token = localStorage.getItem('pex_token');
  return token
    ? {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    : { 'Content-Type': 'application/json' };
}

export async function register(values) {
  return request('/auth/register', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(values)
  });
}

export async function login(values) {
  return request('/auth/login', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(values)
  });
}

export async function fetchPortfolio() {
  return request('/trade/portfolio', { headers: authHeaders() });
}

export async function fetchStocks() {
  return request('/stocks', { headers: authHeaders() });
}

export async function fetchMyStock() {
  return request('/stocks/mine', { headers: authHeaders() });
}

export async function createStock(ticker, price) {
  return request('/stocks', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ticker, price })
  });
}

export async function updateStockPrice(ticker, price) {
  return request(`/stocks/${ticker}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ price })
  });
}

export async function buyShares(ticker, quantity) {
  return request('/trade/buy', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ticker, quantity })
  });
}
