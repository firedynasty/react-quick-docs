// Vercel Serverless Function for File Storage with KV
// Environment variables (set in Vercel dashboard):
// - KV_REST_API_URL: Vercel KV REST API URL
// - KV_REST_API_TOKEN: Vercel KV REST API Token
// - ACCESS_CODE: Password to unlock edit/save operations

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // GET - List all files (no auth required)
    if (req.method === 'GET') {
      const files = await kv.get('files') || {};
      return res.status(200).json({ files });
    }

    // POST - Save/update a file (requires access code)
    if (req.method === 'POST') {
      const { filename, content, accessCode } = req.body;

      // Validate access code
      const validAccessCode = process.env.ACCESS_CODE;
      if (!accessCode || accessCode !== validAccessCode) {
        return res.status(401).json({ error: 'Invalid access code' });
      }

      // Validate input
      if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ error: 'Filename is required' });
      }

      if (content === undefined || content === null) {
        return res.status(400).json({ error: 'Content is required' });
      }

      // Get existing files and update
      const files = await kv.get('files') || {};
      files[filename] = content;
      await kv.set('files', files);

      console.log(`File saved: ${filename} (${content.length} chars)`);
      return res.status(200).json({ success: true, filename });
    }

    // DELETE - Remove a file (requires access code)
    if (req.method === 'DELETE') {
      const { filename } = req.query;
      const { accessCode } = req.body || {};

      // Validate access code
      const validAccessCode = process.env.ACCESS_CODE;
      if (!accessCode || accessCode !== validAccessCode) {
        return res.status(401).json({ error: 'Invalid access code' });
      }

      // Validate input
      if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ error: 'Filename is required' });
      }

      // Get existing files and delete
      const files = await kv.get('files') || {};

      if (!files[filename]) {
        return res.status(404).json({ error: 'File not found' });
      }

      delete files[filename];
      await kv.set('files', files);

      console.log(`File deleted: ${filename}`);
      return res.status(200).json({ success: true, filename });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('KV API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
