export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      data: null,
      message: 'Method not allowed.'
    });
  }

  try {
    // Get Apps Script Web App URL from Vercel Environment Variables
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;

    if (!appsScriptUrl) {
      console.error('APPS_SCRIPT_URL is not configured');
      return res.status(500).json({
        success: false,
        data: null,
        message: 'APPS_SCRIPT_URL is not configured in Vercel. Please set the environment variable.'
      });
    }

    // Validate request body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Request body is empty.'
      });
    }

    // Enforce body size limit (1MB)
    const bodySize = JSON.stringify(req.body).length;
    if (bodySize > 1024 * 1024) {
      return res.status(413).json({
        success: false,
        data: null,
        message: 'Request payload too large.'
      });
    }

    // Send the request from Vercel to Google Apps Script
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response;
    try {
      response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Read Apps Script response
    const text = await response.text();

    // Validate JSON response
    let result;
    try {
      result = JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse Apps Script response:', text);
      return res.status(502).json({
        success: false,
        data: null,
        message: 'Invalid response from Google Apps Script.'
      });
    }

    // Validate result structure
    if (!result || typeof result !== 'object') {
      console.error('Invalid result structure:', result);
      return res.status(502).json({
        success: false,
        data: null,
        message: 'Invalid response structure from Google Apps Script.'
      });
    }

    // Return Apps Script result to client
    return res.status(response.ok ? 200 : response.status).json(result);

  } catch (error) {
    console.error('Server error:', error);

    // Handle timeout errors
    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        data: null,
        message: 'Request timeout. Google Apps Script took too long to respond.'
      });
    }

    return res.status(500).json({
      success: false,
      data: null,
      message: 'Backend connection error: ' + error.message
    });
  }
}
