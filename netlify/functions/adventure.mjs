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
  // console.log('Parsed:', { city, hours });

  try {
    const placeRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${city}&format=json&limit=1`);
    const placeData = await placeRes.json();
    // console.log('Place response:', placeData);
    const place = placeData[0]?.display_name || 'a cool spot';

    const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=imperial`);
    const weatherData = await weatherRes.json();
    // console.log('Weather response:', weatherData);
    const weather = weatherData.weather[0]?.description && weatherData.main?.temp
      ? `${weatherData.weather[0].description}, ${Math.round(weatherData.main.temp)}°F`
      : 'typical weather';
      
      const newsRes = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(place)}&apiKey=${process.env.NEWS_API_KEY}&pageSize=1`);
      const newsData = await newsRes.json();
      console.log('News response:', newsData);
      const news = newsData.articles[0]?.title || 'nothing big today';
      const newsImage = newsData.articles[0]?.urlToImage || '';
      

    // Clean JSON helper
    const cleanJson = (content) => content.replace(/```json\s*|\s*```/g, '').trim();

    // First DeepSeek call: Adventure
    const aiAdventureRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
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
    const adventureOutput = JSON.parse(cleanJson(aiAdventureData.choices[0].message.content));

    // Second DeepSeek call: To-Do
    const aiTodoRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
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
    const todoOutput = JSON.parse(cleanJson(aiTodoData.choices[0].message.content));

    // Combine outputs
    const output = {
      adventure: adventureOutput.adventure,
      todo: todoOutput.todo,
      weather: weather,
      news: news,
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