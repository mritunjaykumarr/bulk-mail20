import { ArrowLeftRight, BadgeDollarSign } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EXCHANGE_RATE_API_KEY } from '../lib/config';

const currencies = [
  { code: 'USD', name: 'US Dollar', country: 'US' },
  { code: 'INR', name: 'Indian Rupee', country: 'IN' },
  { code: 'EUR', name: 'Euro', country: 'EU' },
  { code: 'GBP', name: 'British Pound', country: 'GB' },
  { code: 'AUD', name: 'Australian Dollar', country: 'AU' },
  { code: 'CAD', name: 'Canadian Dollar', country: 'CA' },
  { code: 'JPY', name: 'Japanese Yen', country: 'JP' }
];

export default function CurrencyConverter({ onMessage }) {
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('INR');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fromMeta = useMemo(() => currencies.find((item) => item.code === from), [from]);
  const toMeta = useMemo(() => currencies.find((item) => item.code === to), [to]);

  async function handleConvert(event) {
    event.preventDefault();
    setError('');
    setResult(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    if (!EXCHANGE_RATE_API_KEY) {
      const message = 'Add VITE_EXCHANGE_RATE_API_KEY to enable currency conversion.';
      setError(message);
      onMessage('Currency API is not configured', message, 'Setup');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/${from}`);
      const data = await response.json();

      if (!response.ok || data.result !== 'success') {
        throw new Error(data['error-type'] || 'Unable to fetch exchange rate.');
      }

      const rate = data.conversion_rates?.[to];
      if (!rate) {
        throw new Error('Selected currency is not available.');
      }

      setResult({
        rate,
        value: parsedAmount * rate
      });
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }

  function swapCurrencies() {
    setFrom(to);
    setTo(from);
    setResult(null);
    setError('');
  }

  return (
    <main className="pageShell currencyPage">
      <section className="currencyHero">
        <a className="backLink" href="#home">Back to mail sender</a>
        <span className="eyebrow">Separate utility page</span>
        <h1>Currency Converter</h1>
        <p>Convert between configured currencies with ExchangeRate-API.</p>
      </section>

      <section className="panel converterPanel">
        <form onSubmit={handleConvert}>
          <label className="field">
            <span>Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>

          <div className="converterGrid">
            <CurrencySelect label="From" value={from} onChange={setFrom} meta={fromMeta} />
            <button className="iconButton swapButton" type="button" onClick={swapCurrencies} title="Swap currencies">
              <ArrowLeftRight size={18} aria-hidden="true" />
              <span className="srOnly">Swap currencies</span>
            </button>
            <CurrencySelect label="To" value={to} onChange={setTo} meta={toMeta} />
          </div>

          <button className="sendButton" type="submit" disabled={loading}>
            <BadgeDollarSign size={20} aria-hidden="true" />
            <span>{loading ? 'Converting...' : 'Convert'}</span>
          </button>
        </form>

        {result && (
          <div className="conversionResult">
            <span>{amount} {from} equals</span>
            <strong>{result.value.toFixed(2)} {to}</strong>
            <small>Rate: 1 {from} = {result.rate} {to}</small>
          </div>
        )}

        {error && <p className="formError">{error}</p>}
      </section>
    </main>
  );
}

function CurrencySelect({ label, value, onChange, meta }) {
  return (
    <label className="field currencySelect">
      <span>{label}</span>
      <div className="selectWithFlag">
        {meta?.country && (
          <img
            src={`https://flagsapi.com/${meta.country}/flat/32.png`}
            alt=""
            loading="lazy"
          />
        )}
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {currencies.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code} - {currency.name}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
