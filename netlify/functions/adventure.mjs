import fetch from 'node-fetch';
import process from 'process';
process.setMaxListeners(15);

export const handler = async (event) => {
  // console.log('Function invoked with:', event.body);
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (parseError) {
    console.error('Body parse error:', parseError);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid input format' }) };
  }
  const { city, hours, specialPrompt } = body;
  const apiKey = event.headers['x-deepseek-api-key'] || process.env.DEEPSEEK_API_KEY;
  // console.log('Parsed:', { city, hours, specialPrompt });

  try {
    const placeRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${city}&format=json&limit=1`);
    const placeData = await placeRes.json();
    // console.log('Place response:', placeData);
    const place = placeData[0]?.display_name || 'a cool spot';

    const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=imperial`);
    const weatherData = await weatherRes.json();
    console.log('Weather response:', weatherData);
    const weather = weatherData.weather[0]?.description && weatherData.main?.temp
      ? `${weatherData.weather[0].description}, ${Math.round(weatherData.main.temp)}°F`
      : 'typical weather';

    const newsRes = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(city)}&apiKey=${process.env.NEWS_API_KEY}&pageSize=1`);
    const newsData = await newsRes.json();
    // console.log('News response:', newsData);
    const news = newsData.articles[0]?.description || 'Nothing Big today';
    const newsImage = newsData.articles[0]?.urlToImage || '';

    const cleanJson = (content) => {
      const cleaned = content.replace(/```json\s*|\s*```/g, '').trim();
      console.log('Cleaned JSON:', cleaned); // Log to debug
      return cleaned;
    };

    if (specialPrompt === 'What is my room WiFi password?') {
      const aiWifiRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{
            role: 'user',
            content: `Pretend you're a quirky hotel AI. In ${city}, what might my room WiFi password be? Keep it short and fun. Return only valid JSON, no Markdown: {"adventure": "your answer"}`
          }],
          max_tokens: 50
        })
      });
      const aiWifiData = await aiWifiRes.json();
      // console.log('DeepSeek wifi response:', aiWifiData);
      const rawWifiContent = aiWifiData.choices[0].message.content;
      // console.log('Raw WiFi content:', rawWifiContent);
      const wifiOutput = JSON.parse(cleanJson(rawWifiContent));
      return {
        statusCode: 200,
        body: JSON.stringify(wifiOutput)
      };
    }

    const aiAdventureRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `In ${hours}h in ${city}, suggest a short mini-adventure at ${place}. Return only valid JSON, no Markdown: {"adventure": "short description"}`
        }],
        max_tokens: 50
      })
    });
    const aiAdventureData = await aiAdventureRes.json();
    // console.log('DeepSeek adventure response:', aiAdventureData);
    const rawAdventureContent = aiAdventureData.choices[0].message.content;
    // console.log('Raw adventure content:', rawAdventureContent);
    let adventureOutput;
    try {
      adventureOutput = JSON.parse(cleanJson(rawAdventureContent));
    } catch (e) {
      console.error('Adventure JSON parse error:', e);
      adventureOutput = { adventure: `Explore ${place} for ${hours} hours!` }; // Fallback
    }

    const aiTodoRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `For a ${hours}h adventure at ${place} in ${city}, suggest 3 short to-do items. Return only valid JSON, no Markdown: {"todo": ["item1", "item2", "item3"]}`
        }],
        max_tokens: 60
      })
    });
    const aiTodoData = await aiTodoRes.json();
    // console.log('DeepSeek todo response:', aiTodoData);
    const rawTodoContent = aiTodoData.choices[0].message.content;
    // console.log('Raw todo content:', rawTodoContent);
    let todoOutput;
    try {
      todoOutput = JSON.parse(cleanJson(rawTodoContent));
    } catch (e) {
      console.error('Todo JSON parse error:', e);
      todoOutput = { todo: [`Visit ${place}`, 'Enjoy the view', 'Take a break'] }; // Fallback
    }

    const output = {
      adventure: adventureOutput.adventure,
      todo: todoOutput.todo,
      weather,
      news,
      image: newsImage
    };
    // console.log('Output:', output);

    return {
      statusCode: 200,
      body: JSON.stringify(output)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Oops, something broke!' })
    };
  }
};
