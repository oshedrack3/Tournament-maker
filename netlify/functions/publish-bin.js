// netlify/functions/publish-bin.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  
  try {
    const { id, payload } = JSON.parse(event.body);
    const JSONBIN_KEY = process.env.JSONBIN_KEY;
    
    if (!JSONBIN_KEY) throw new Error("JSONBIN_KEY not set");
    
    const res = await fetch(`https://api.jsonbin.io/v3/b/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_KEY,
        'X-Bin-Versioning': 'false'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};


