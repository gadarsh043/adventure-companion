import { useState, useEffect } from 'react';
import './Home.scss';

const Home = () => {
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [hours, setHours] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [userApiKey, setUserApiKey] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showApiInstructions, setShowApiInstructions] = useState(false);

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,cca2')
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a, b) => a.name.common.localeCompare(b.name.common));
        setCountries(sorted);
      })
      .catch(err => console.error('Failed to fetch countries:', err));
  }, []);

  const handleAuth = () => {
    if (password === 'Z@ak2024!' || userApiKey) {
      setIsAuthorized(true);
    } else {
      alert('Nope! Guess "What’s My Room WiFi Password?" or your own DeepSeek API key, buddy!');
      setPassword('');
    }
  };

  const getAdventure = async () => {
    setLoading(true);
    try {
      const res = await fetch('/.netlify/functions/adventure', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(userApiKey && { 'X-DeepSeek-API-Key': userApiKey })
        },
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

  if (!isAuthorized) {
    return (
      <div className="app">
        <div className="dialog-overlay">
          <div className="dialog-box">
            <h2>Hey, Adventurer!</h2>
            <p>Unlock with the magic word or your DeepSeek API key.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="What’s My Room WiFi Password?"
              onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
              autoFocus
            />
            <input
              type="text"
              value={userApiKey}
              onChange={(e) => setUserApiKey(e.target.value)}
              placeholder="Or your DeepSeek API key"
              onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
            />
            <div className="dialog-buttons">
              <button onClick={handleAuth}>Let’s Go!</button>
              <button 
                onClick={() => setShowApiInstructions(!showApiInstructions)}
                className="info-button"
              >
                {showApiInstructions ? 'Hide Info' : 'Get API Key?'}
              </button>
            </div>
            {showApiInstructions && (
              <div className="api-instructions">
                <p>Grab your own DeepSeek API key:</p>
                <ul>
                  <li>Head to <a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer">DeepSeek</a>.</li>
                  <li>Sign up—it’s quick!</li>
                  <li>Find the API section, snag your key (looks like sk-abc123...).</li>
                  <li>Pop it in here and skip the password!</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
              <h2>{result.adventure.includes('WiFi') ? 'What’s My Room WiFi Password?' : 'Your Adventure'}</h2>
              <p>{result.adventure}</p>
              {!result.adventure.includes('WiFi') && (
                <>
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
            </>
          )}
          <button onClick={reset} disabled={loading}>Plan Another</button>
        </div>
      )}
    </div>
  );
};

export default Home;
