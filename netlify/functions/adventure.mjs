import fetch from 'node-fetch';

export const handler = async (event) => {
  // console.log('Function invoked with:', event.body);
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (parseError) {
    console.error('Body parse error:', parseError);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid input format' }) };
  }
  const { city, hours } = body;
  const apiKey = event.headers['x-deepseek-api-key'] || process.env.DEEPSEEK_API_KEY;
  const type = event.queryStringParameters?.type || 'place';

  const cleanJson = (content) => {
    const cleaned = content.replace(/```json\s*|\s*```/g, '').trim();
    console.log('Raw JSON from DeepSeek:', cleaned);
    return cleaned;
  };

  const timeFetch = async (label, url, options) => {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s cap
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      console.log(`${label} took ${Date.now() - start}ms`);
      return res;
    } catch (e) {
      console.error(`${label} timed out or failed:`, e);
      throw e;
    } finally {
      clearTimeout(timeout);
    }
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

    if (type === 'plan') {
      const aiRes = await timeFetch('DeepSeek Plan', 'https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{
            role: 'user',
            content: `For a ${hours}h trip in ${city}, give a short adventure, 3 to-dos, 3 tips. JSON: {"adventure": "desc", "todo": ["1", "2", "3"], "tips": ["1", "2", "3"]}`
          }],
          max_tokens: 250  // Up from 150
        })
      });
      const aiData = await aiRes.json();
      const rawContent = aiData.choices[0].message.content;
      let aiOutput;
      try {
        aiOutput = JSON.parse(cleanJson(rawContent));
      } catch (e) {
        console.error('AI JSON parse error:', e);
        aiOutput = {
          adventure: `Explore a cool spot in ${city} for ${hours}h!`,
          todo: ['Visit a landmark', 'Enjoy the view', 'Take a break'],
          tips: ['Pack light', 'Stay hydrated', 'Check local times']
        };
      }
      return {
        statusCode: 200,
        body: JSON.stringify(aiOutput)
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
