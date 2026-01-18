// Simple auth endpoint to validate access code

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { accessCode } = req.body;
    const validAccessCode = process.env.ACCESS_CODE;

    // Check if request is from localhost
    const origin = req.headers.origin || req.headers.referer || '';
    const isFromLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');

    // Accept valid access code or 'localhost' from localhost origin
    const isValidCode = (accessCode && accessCode === validAccessCode) || (accessCode === 'localhost' && isFromLocalhost);

    if (isValidCode) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(401).json({ error: 'Invalid access code' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
