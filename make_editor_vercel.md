# Building a Document Editor with Vercel Blob Storage

## Overview
A simple React document editor with sidebar file list, textarea editing, and Vercel Blob for persistent storage.

## 1. Project Structure

```
src/
  App.js          # Main app wrapper
  ReportChat.js   # Document editor component
api/
  files.js        # Vercel serverless function for Blob storage
```

## 2. Dependencies (package.json)

```json
{
  "dependencies": {
    "@vercel/blob": "^0.23.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  }
}
```

## 3. API Route (api/files.js)

```js
import { put, list, del } from '@vercel/blob';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - List all files
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: 'docs/' });
      const files = {};
      for (const blob of blobs) {
        const response = await fetch(blob.url);
        const content = await response.text();
        const filename = blob.pathname.replace('docs/', '');
        files[filename] = content;
      }
      return res.status(200).json({ files });
    }

    // POST - Save file (requires access code)
    if (req.method === 'POST') {
      const { filename, content, accessCode } = req.body;

      if (accessCode !== process.env.ACCESS_CODE) {
        return res.status(401).json({ error: 'Invalid access code' });
      }

      await put(`docs/${filename}`, content, {
        access: 'public',
        addRandomSuffix: false,
      });
      return res.status(200).json({ success: true });
    }

    // DELETE - Remove file (requires access code)
    if (req.method === 'DELETE') {
      const { filename } = req.query;
      const { accessCode } = req.body;

      if (accessCode !== process.env.ACCESS_CODE) {
        return res.status(401).json({ error: 'Invalid access code' });
      }

      const { blobs } = await list({ prefix: `docs/${filename}` });
      const blob = blobs.find(b => b.pathname === `docs/${filename}`);
      if (blob) await del(blob.url);
      return res.status(200).json({ success: true });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

## 4. React Component Key Parts

```js
// Load files from API
const loadFiles = async () => {
  const response = await fetch('/api/files');
  const data = await response.json();
  setFiles(data.files || {});
};

// Save file to API
const saveFile = async () => {
  await fetch('/api/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: selectedFile,
      content: editContent,
      accessCode: accessCode,
    }),
  });
};
```

## 5. Vercel Setup

### Create Blob Store:
1. Vercel Dashboard → **Storage** tab
2. **Create Database** → **Blob**
3. Name it (e.g., `documents-blob`)
4. Click **Connect to Project**
5. Select all environments: Development, Preview, Production
6. Keep prefix as `BLOB` (creates `BLOB_READ_WRITE_TOKEN` automatically)

### Add Access Code:
1. **Settings** → **Environment Variables**
2. Add: `ACCESS_CODE` = your-password-here

### Deploy:
Push to GitHub - Vercel auto-deploys.

## 6. How Environment Variables Work

**In code (visible on GitHub):**
```js
token: process.env.BLOB_READ_WRITE_TOKEN
```

**Actual value (only in Vercel dashboard, never in repo):**
```
BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_abc123..."
```

The `@vercel/blob` package automatically reads `BLOB_READ_WRITE_TOKEN`. If you use a custom prefix like `BLOB2`, you must pass the token explicitly:
```js
await put('file.txt', content, {
  token: process.env.BLOB2_READ_WRITE_TOKEN
});
```

## 7. Usage

1. Open the app
2. Click **Unlock Editing** → enter your ACCESS_CODE
3. Click **+ New File** → enter filename
4. Edit content in textarea
5. Click **Save** → stored in Vercel Blob

## Cost

Vercel Blob Free Tier:
- 1GB storage
- 1GB bandwidth/month
- No marketplace needed
