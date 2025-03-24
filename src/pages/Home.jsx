import { useState, useEffect } from 'react';
import './Home.scss';

const Home = () => {
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [hours, setHours] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [password, setPassword] = useState('');
  const [userApiKey, setUserApiKey] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showApiInstructions, setShowApiInstructions] = useState(false);
  const [checkedTodos, setCheckedTodos] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);

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

  const fetchAdventure = async (type) => {
    const url = type === 'plan'
      ? 'https://adventure-companion-backend-production.up.railway.app/api/plan'  // Add /api/plan
      : `/.netlify/functions/adventure?type=${type}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(userApiKey && { 'X-DeepSeek-API-Key': userApiKey })
      },
      body: JSON.stringify({ city: `${city}, ${country}`, hours })
    });
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    return res.json();
  };

  const getAdventure = async () => {
    setLoading(true);
    setCheckedTodos([]);
    setResult(null);
    
    try {
      setLoadingMessage('Finding a spot...');
      const placeData = await fetchAdventure('place');
      
      setLoadingMessage('Checking weather...');
      const weatherData = await fetchAdventure('weather');
      
      setLoadingMessage('Planning your adventure...');
      const planData = await fetchAdventure('plan');
      
      setResult({
        tripTitle: `${city} Getaway: ${hours} Hours`,
        place: placeData.place,
        weather: weatherData.weather,
        adventure: planData.adventure,
        todo: planData.todo,
        tips: planData.tips
      });
    } catch (error) {
      setResult({ error: error.message });
    }
    setLoading(false);
    setLoadingMessage('');
  };

  const toggleTodo = (index) => {
    setCheckedTodos(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const copyTodo = (item) => {
    navigator.clipboard.writeText(item);
    alert('To-do copied to clipboard!');
  };

  const shareAdventure = () => {
    const shareText = `✨ ${result.tripTitle} ✨\n\nAdventure: ${result.adventure}\nTo-Do:\n${result.todo.map((t) => `- ${t}`).join('\n')}\nWeather: ${result.weather}\nTips:\n${result.tips.map((t) => `- ${t}`).join('\n')}`;
    if (navigator.share) {
      navigator.share({
        title: result.tripTitle,
        text: shareText,
        url: window.location.href
      }).catch(err => console.error('Share failed:', err));
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Plan copied to clipboard!');
    }
  };

  const handleCityChange = async (e) => {
    const value = e.target.value;
    setCity(value);
    if (value.length > 2) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${value},${country}&format=json&limit=5`);
      const data = await res.json();
      setCitySuggestions(data.map(d => d.display_name));
    } else {
      setCitySuggestions([]);
    }
  };

  const reset = () => {
    setCountry('');
    setCity('');
    setHours('');
    setResult(null);
    setCheckedTodos([]);
  };

  if (!isAuthorized) {
    return (
      <div className="app">
        <div className="dialog-overlay">
          <div className="dialog-box">
            <h2>Ready to Explore?</h2>
            <p>Unlock with the secret code or your DeepSeek API key.</p>
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
              <button onClick={handleAuth}>Unlock Adventure</button>
              <button 
                onClick={() => setShowApiInstructions(!showApiInstructions)}
                className="info-button"
              >
                {showApiInstructions ? 'Hide' : 'API Key Info'}
              </button>
            </div>
            {showApiInstructions && (
              <div className="api-instructions">
                <p>Get your DeepSeek API key:</p>
                <ul>
                  <li>Visit <a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer">DeepSeek</a>.</li>
                  <li>Sign up or log in.</li>
                  <li>Generate a key in API settings (e.g., sk-abc123...).</li>
                  <li>Use it here to skip the code!</li>
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
      <header className="app-header">
        <h1>Adventure Awaits</h1>
        <p>Plan your next escape in seconds!</p>
      </header>
      {!result ? (
        <div className="input-form">
          <select
            value={country}
            onChange={(e) => { setCountry(e.target.value); setCity(''); }}
            disabled={loading || !countries.length}
          >
            <option value="">Pick a Country</option>
            {countries.map(c => (
              <option key={c.cca2} value={c.name.common}>{c.name.common}</option>
            ))}
          </select>
          <div className="city-input">
            <input
              value={city}
              onChange={handleCityChange}
              placeholder="City or Place"
              disabled={loading || !country}
            />
            {citySuggestions.length > 0 && (
              <ul className="suggestions">
                {citySuggestions.map((s, i) => (
                  <li key={i} onClick={() => { setCity(s); setCitySuggestions([]); }}>{s}</li>
                ))}
              </ul>
            )}
          </div>
          <input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            onWheel={(e) => e.target.blur()}
            placeholder="Hours Free (1+)"
            min="1"
            disabled={loading}
          />
          <button onClick={getAdventure} disabled={loading || !country || !city || !hours}>
            {loading ? 'Planning...' : 'Launch Adventure'}
          </button>
        </div>
      ) : (
        <div className="result-container">
          <div className="result-hero">
            <h2>{result.tripTitle}</h2>
            <button className="share-btn" onClick={shareAdventure}>Share Plan</button>
          </div>
          {loading && <p className="loading">{loadingMessage}</p>}
          {result.error ? (
            <p className="error">{result.error}</p>
          ) : (
            <>
              <section className="todo-section">
                <h3>To-Do List</h3>
                <ul>
                  {result.todo.map((item, index) => (
                    <li key={index} className={checkedTodos.includes(index) ? 'checked' : ''}>
                      <input
                        type="checkbox"
                        checked={checkedTodos.includes(index)}
                        onChange={() => toggleTodo(index)}
                      />
                      <span>{item}</span>
                      <button className="copy-btn" onClick={() => copyTodo(item)}>Copy</button>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="info-section">
                <h3>Weather</h3>
                <p>{result.weather}</p>
                <h3>Travel Tips</h3>
                <ul>
                  {result.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </section>
            </>
          )}
          <button className="reset-btn" onClick={reset} disabled={loading}>New Adventure</button>
        </div>
      )}
    </div>
  );
};

export default Home;
