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
  const { city, hours } = body;
  const apiKey = event.headers['x-deepseek-api-key'] || process.env.DEEPSEEK_API_KEY;

  const cleanJson = (content) => {
    const cleaned = content.replace(/```json\s*|\s*```/g, '').trim();
    console.log('Cleaned JSON:', cleaned);
    return cleaned;
  };

  try {
    // Parallelize API calls
    const [placeRes, weatherRes, aiAdventureRes, aiTodoRes, aiTipsRes] = await Promise.all([
      fetch(`https://nominatim.openstreetmap.org/search?q=${city}&format=json&limit=1`),
      fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=imperial`),
      fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{
            role: 'user',
            content: `In ${hours}h in ${city}, suggest a short mini-adventure at a notable place. Return only valid JSON, no Markdown: {"adventure": "short description"}`
          }],
          max_tokens: 50
        })
      }),
      fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{
            role: 'user',
            content: `For a ${hours}h adventure in ${city}, suggest 3 short to-do items. Return only valid JSON, no Markdown: {"todo": ["item1", "item2", "item3"]}`
          }],
          max_tokens: 60
        })
      }),
      fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{
            role: 'user',
            content: `For a trip to ${city}, suggest 3 short, practical travel tips. Return only valid JSON, no Markdown: {"tips": ["tip1", "tip2", "tip3"]}`
          }],
          max_tokens: 60
        })
      })
    ]);

    // Process responses
    const placeData = await placeRes.json();
    const place = placeData[0]?.display_name || 'a cool spot';

    const weatherData = await weatherRes.json();
    const weather = weatherData.weather[0]?.description && weatherData.main?.temp
      ? `${weatherData.weather[0].description}, ${Math.round(weatherData.main.temp)}°F`
      : 'typical weather';

    const aiAdventureData = await aiAdventureRes.json();
    const rawAdventureContent = aiAdventureData.choices[0].message.content;
    let adventureOutput;
    try {
      adventureOutput = JSON.parse(cleanJson(rawAdventureContent));
    } catch (e) {
      console.error('Adventure JSON parse error:', e);
      adventureOutput = { adventure: `Explore ${place} for ${hours} hours!` };
    }

    const aiTodoData = await aiTodoRes.json();
    // console.log('DeepSeek todo response:', aiTodoData);
    const rawTodoContent = aiTodoData.choices[0].message.content;
    // console.log('Raw todo content:', rawTodoContent);
    let todoOutput;
    try {
      todoOutput = JSON.parse(cleanJson(rawTodoContent));
    } catch (e) {
      console.error('Todo JSON parse error:', e);
      todoOutput = { todo: [`Visit ${place}`, 'Enjoy the view', 'Take a break'] };
    }

    const aiTipsData = await aiTipsRes.json();
    const rawTipsContent = aiTipsData.choices[0].message.content;
    let tipsOutput;
    try {
      tipsOutput = JSON.parse(cleanJson(rawTipsContent));
    } catch (e) {
      console.error('Tips JSON parse error:', e);
      tipsOutput = { tips: ['Pack light', 'Stay hydrated', 'Check local times'] };
    }

    const output = {
      adventure: adventureOutput.adventure,
      todo: todoOutput.todo,
      weather,
      tips: tipsOutput.tips
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
