import { useState, useEffect } from 'react';
import './Home.scss';

const Home = () => {
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [hours, setHours] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,cca2')
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a, b) => a.name.common.localeCompare(b.name.common));
        setCountries(sorted);
      })
      .catch(err => console.error('Failed to fetch countries:', err));
  }, []);

  const getAdventure = async () => {
    setLoading(true);
    try {
      const res = await fetch('/.netlify/functions/adventure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: `${city}, ${country}`, hours })
      });
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  const reset = () => {
    setCountry('');
    setCity('');
    setHours('');
    setResult(null);
  };

  return (
    <div className="app">
      <h1>AI Adventure Companion</h1>
      {!result ? (
        <div className="input-form">
          <select
            value={country}
            onChange={(e) => { setCountry(e.target.value); setCity(''); }}
            disabled={loading || !countries.length}
          >
            <option value="">Select Country</option>
            {countries.map(c => (
              <option key={c.cca2} value={c.name.common}>{c.name.common}</option>
            ))}
          </select>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city or place"
            disabled={loading || !country}
          />
          <input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Hours free"
            min="1"
            max="24"
            disabled={loading}
          />
          <button onClick={getAdventure} disabled={loading || !country || !city || !hours}>
            {loading ? 'Planning...' : 'Plan My Adventure!'}
          </button>
        </div>
      ) : (
        <div className="result">
          {result.error ? (
            <p className="error">{result.error}</p>
          ) : (
            <>
              <h2>Your Adventure</h2>
              <p>{result.adventure}</p>
              <h2>To-Do</h2>
              <ul>{result.todo.map((item, i) => <li key={i}>{item}</li>)}</ul>
              <h2>Weather</h2>
              <p>{result.weather}</p>
              <h2>News</h2>
              <p>{result.news}</p>
              {result.image && (
                <div className="news-image">
                  <img src={result.image} alt="News" />
                </div>
              )}
            </>
          )}
          <button onClick={reset} disabled={loading}>Plan Another</button>
        </div>
      )}
    </div>
  );
};

export default Home;