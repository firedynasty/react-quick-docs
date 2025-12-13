# Document Editor with Vercel Blob Storage

## Setup Instructions

1. Create Blob store in Vercel: Storage > Create > Blob
2. Connect to project (all environments)
3. Add ACCESS_CODE environment variable in Settings > Environment Variables
4. Deploy

## Environment Variables Required

- `BLOB_READ_WRITE_TOKEN` - Auto-added when connecting Blob store
- `ACCESS_CODE` - Your password for editing/saving files

## Usage

1. Click "Unlock Editing" and enter your access code
2. Click "+ New File" to create a document
3. Click "Edit" to modify, "Save" to persist to Blob storage
