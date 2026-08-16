export default async function handler(req, res) {
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
    const appsScriptUrl = process.env.APP_SCRIPT_URL;

    if (!appsScriptUrl) {
      return res.status(500).json({
        success: false,
        data: null,
        message: 'APPS_SCRIPT_URL is not configured in Vercel.'
      });
    }

    // Send the request from Vercel to Google Apps Script
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    // Read Apps Script response
    const text = await response.text();

    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      return res.status(502).json({
        success: false,
        data: null,
        message: 'Invalid response from Google Apps Script.'
      });
    }

    // Return Apps Script result to index.html
    return res
      .status(response.ok ? 200 : response.status)
      .json(result);

  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Backend connection error: ' + error.message
    });
  }
}