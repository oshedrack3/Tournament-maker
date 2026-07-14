exports.handler = async (event) => {
  try {
    // 1. Check if key exists
    const JSONBIN_KEY = process.env.JSONBIN_KEY;
    if (!JSONBIN_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "DEBUG: JSONBIN_KEY is missing in Netlify" }) };
    }
    
    const { id, payload } = JSON.parse(event.body);
    if (!id || !payload) {
      return { statusCode: 400, body: JSON.stringify({ error: "DEBUG: Missing id or payload" }) };
    }
    
    // 2. Try PUT
    let response = await fetch(`https://api.jsonbin.io/v3/b/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_KEY,
      },
      body: JSON.stringify(payload)
    });
    
    // 3. If 404, try POST
    if (response.status === 404) {
      response = await fetch(`https://api.jsonbin.io/v3/b`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_KEY,
          'X-Bin-Name': `tournament-${id}`,
          'X-Bin-Private': 'false'
        },
        body: JSON.stringify(payload)
      });
    }
    
    const text = await response.text(); // get raw text first
    
    // 4. Try to parse JSON. If it fails, show the raw HTML
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ error: `DEBUG: JSONBin returned HTML. Status: ${response.status}. Raw: ${text.substring(0,200)}` }) };
    }
    
    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: `DEBUG: JSONBin Error: ${JSON.stringify(data)}` }) };
    }
    
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
    
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: `DEBUG: Server Crash: ${error.message}` }) };
  }
};