import fetch from 'node-fetch';

export const handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (parseError) {
    console.error('Body parse error:', parseError);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid input format' }) };
  }
  const { city } = body;
  const type = event.queryStringParameters?.type || 'place';

  const timeFetch = async (label, url, options) => {
    const start = Date.now();
    const res = await fetch(url, options);
    console.log(`${label} took ${Date.now() - start}ms`);
    return res;
  };

  try {
    if (type === 'place') {
      const placeRes = await timeFetch('OpenStreetMap', `https://nominatim.openstreetmap.org/search?q=${city}&format=json&limit=1`);
      const placeData = await placeRes.json();
      const place = placeData[0]?.display_name || 'a cool spot';
      return {
        statusCode: 200,
        body: JSON.stringify({ place })
      };
    }

    if (type === 'weather') {
      const weatherRes = await timeFetch('OpenWeatherMap', `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=imperial`);
      const weatherData = await weatherRes.json();
      const weather = weatherData.weather[0]?.description && weatherData.main?.temp
        ? `${weatherData.weather[0].description}, ${Math.round(weatherData.main.temp)}°F`
        : 'typical weather';
      return {
        statusCode: 200,
        body: JSON.stringify({ weather })
      };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid type' }) };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Oops, something broke!' })
    };
  }
};
