import React, { useState, useEffect, useRef } from 'react';

const DocumentEditor = () => {
  // Files state
  const [files, setFiles] = useState({}); // {filename: content}
  const [selectedFile, setSelectedFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [darkMode, setDarkMode] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const textareaRef = useRef(null);

  // Load files on mount
  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load files from API
  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || {});
        // Auto-select first file if none selected
        const filenames = Object.keys(data.files || {});
        if (filenames.length > 0 && !selectedFile) {
          setSelectedFile(filenames[0]);
        }
      }
    } catch (err) {
      console.error('Error loading files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Authenticate with access code
  const authenticate = () => {
    const code = prompt('Enter access code to enable editing:');
    if (code) {
      setAccessCode(code);
      setIsAuthenticated(true);
    }
  };

  // Create new file
  const createNewFile = () => {
    if (!isAuthenticated) {
      authenticate();
      return;
    }

    const filename = prompt('Enter filename (e.g., notes.txt):');
    if (!filename) return;

    // Add extension if not provided
    let finalName = filename;
    if (!finalName.includes('.')) {
      finalName += '.txt';
    }

    // Check if file exists
    if (files[finalName]) {
      alert('File already exists!');
      return;
    }

    // Add new file locally
    setFiles(prev => ({ ...prev, [finalName]: '' }));
    setSelectedFile(finalName);
    setEditContent('');
    setOriginalContent('');
    setIsEditing(true);
    setHasUnsavedChanges(true);
  };

  // Select a file
  const selectFile = (filename) => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    setSelectedFile(filename);
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  // Enter edit mode
  const enterEditMode = () => {
    if (!isAuthenticated) {
      authenticate();
      return;
    }
    if (!selectedFile) return;

    setEditContent(files[selectedFile] || '');
    setOriginalContent(files[selectedFile] || '');
    setIsEditing(true);

    // Focus textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  // Cancel edit mode
  const cancelEditMode = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('Discard unsaved changes?')) {
        return;
      }
    }
    setIsEditing(false);
    setEditContent('');
    setHasUnsavedChanges(false);
  };

  // Handle content change
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setEditContent(newContent);
    setHasUnsavedChanges(newContent !== originalContent);
  };

  // Save file to API
  const saveFile = async () => {
    if (!selectedFile || !accessCode) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile,
          content: editContent,
          accessCode: accessCode,
        }),
      });

      if (response.ok) {
        // Update local state
        setFiles(prev => ({ ...prev, [selectedFile]: editContent }));
        setOriginalContent(editContent);
        setHasUnsavedChanges(false);
        setIsEditing(false);
        alert('File saved!');
      } else {
        const data = await response.json();
        alert('Error saving: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete file
  const deleteFile = async (filename) => {
    if (!isAuthenticated) {
      authenticate();
      return;
    }

    if (!window.confirm(`Delete "${filename}"?`)) return;

    try {
      const response = await fetch(`/api/files?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode }),
      });

      if (response.ok) {
        setFiles(prev => {
          const newFiles = { ...prev };
          delete newFiles[filename];
          return newFiles;
        });
        if (selectedFile === filename) {
          const remaining = Object.keys(files).filter(f => f !== filename);
          setSelectedFile(remaining[0] || null);
        }
        setIsEditing(false);
      } else {
        const data = await response.json();
        alert('Error deleting: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  };

  // Font size controls
  const changeFontSize = (delta) => {
    setFontSize(prev => Math.max(10, Math.min(32, prev + delta)));
  };

  // Get sorted filenames
  const sortedFilenames = Object.keys(files).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={{
        ...styles.sidebar,
        background: darkMode ? '#1a1a2e' : '#f5f5f5',
      }}>
        <div style={{
          ...styles.sidebarHeader,
          background: darkMode ? '#0d0d1a' : '#e0e0e0',
          color: darkMode ? '#4da6ff' : '#333',
        }}>
          DOCUMENTS
        </div>

        {/* New File Button */}
        <button
          onClick={createNewFile}
          style={styles.newFileBtn}
        >
          + New File
        </button>

        {/* Auth Status */}
        {!isAuthenticated && (
          <button
            onClick={authenticate}
            style={styles.authBtn}
          >
            Unlock Editing
          </button>
        )}

        {/* Files List */}
        <div style={styles.filesList}>
          {isLoading ? (
            <div style={{ padding: '20px', color: darkMode ? '#888' : '#666' }}>
              Loading...
            </div>
          ) : sortedFilenames.length === 0 ? (
            <div style={{ padding: '20px', color: darkMode ? '#888' : '#666' }}>
              No files yet
            </div>
          ) : (
            sortedFilenames.map((filename) => (
              <div
                key={filename}
                style={{
                  ...styles.fileItem,
                  background: selectedFile === filename
                    ? (darkMode ? '#3a3a5a' : '#d0d0d0')
                    : 'transparent',
                }}
                onClick={() => selectFile(filename)}
              >
                <span style={{
                  ...styles.fileName,
                  color: darkMode ? '#e0e0e0' : '#333',
                }}>
                  {filename}
                </span>
                <span style={styles.fileSize}>
                  {(files[filename]?.length || 0).toLocaleString()} chars
                </span>
              </div>
            ))
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={loadFiles}
          style={styles.refreshBtn}
        >
          Refresh
        </button>
      </div>

      {/* Main Area */}
      <div style={{
        ...styles.mainArea,
        background: darkMode ? 'rgba(0, 0, 0, 0.75)' : '#f5f5f5',
      }}>
        {/* Control Bar */}
        <div style={{
          ...styles.controlBar,
          background: darkMode ? 'rgba(0, 0, 0, 0.8)' : '#e0e0e0',
        }}>
          <span style={{
            ...styles.currentFileName,
            color: darkMode ? '#fff' : '#333',
          }}>
            {selectedFile || 'Select a file'}
            {hasUnsavedChanges && ' *'}
          </span>

          <div style={styles.controls}>
            {/* Edit/Save/Cancel Buttons */}
            {!isEditing ? (
              <button
                onClick={enterEditMode}
                disabled={!selectedFile}
                style={{
                  ...styles.editBtn,
                  opacity: !selectedFile ? 0.5 : 1,
                }}
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={saveFile}
                  disabled={isSaving}
                  style={styles.saveBtn}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={cancelEditMode}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
              </>
            )}

            {/* Delete Button */}
            {selectedFile && !isEditing && (
              <button
                onClick={() => deleteFile(selectedFile)}
                style={styles.deleteBtn}
              >
                Delete
              </button>
            )}

            {/* Font Size Controls */}
            <button
              onClick={() => changeFontSize(-2)}
              style={styles.fontBtn}
            >
              -
            </button>
            <button
              onClick={() => changeFontSize(2)}
              style={styles.fontBtn}
            >
              +
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={styles.fontBtn}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={styles.contentArea}>
          {!selectedFile ? (
            <div style={{
              ...styles.emptyState,
              color: darkMode ? '#888' : '#666',
            }}>
              <p>Select a file from the sidebar or create a new one</p>
            </div>
          ) : isEditing ? (
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={handleContentChange}
              style={{
                ...styles.textarea,
                fontSize: `${fontSize}px`,
                background: darkMode ? '#1a1a1a' : 'white',
                color: darkMode ? '#e0e0e0' : '#333',
              }}
              placeholder="Start typing..."
            />
          ) : (
            <div style={{
              ...styles.viewerContent,
              fontSize: `${fontSize}px`,
              background: darkMode ? '#1a1a1a' : 'white',
              color: darkMode ? '#e0e0e0' : '#333',
            }}>
              <pre style={styles.preContent}>
                {files[selectedFile] || '(empty file)'}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  sidebar: {
    width: '250px',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #333',
  },
  sidebarHeader: {
    padding: '15px 10px',
    fontSize: '14px',
    fontWeight: 'bold',
    textAlign: 'center',
    borderBottom: '1px solid #333',
  },
  newFileBtn: {
    margin: '10px',
    padding: '12px 16px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  authBtn: {
    margin: '0 10px 10px',
    padding: '10px 16px',
    background: '#ff9800',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  filesList: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px',
  },
  fileItem: {
    padding: '10px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '4px',
    transition: 'background 0.2s',
  },
  fileName: {
    display: 'block',
    fontSize: '14px',
    marginBottom: '2px',
  },
  fileSize: {
    fontSize: '11px',
    color: '#888',
  },
  refreshBtn: {
    margin: '10px',
    padding: '10px 16px',
    background: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  controlBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '15px 20px',
  },
  currentFileName: {
    fontSize: '16px',
    fontWeight: '500',
  },
  controls: {
    display: 'flex',
    gap: '8px',
  },
  editBtn: {
    padding: '10px 20px',
    background: '#9c27b0',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 20px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '10px 20px',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '10px 16px',
    background: '#e91e63',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  fontBtn: {
    width: '40px',
    height: '40px',
    background: '#4da6ff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentArea: {
    flex: 1,
    padding: '20px',
    overflow: 'hidden',
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  textarea: {
    width: '100%',
    height: '100%',
    padding: '20px',
    border: 'none',
    borderRadius: '8px',
    resize: 'none',
    fontFamily: "'Courier New', monospace",
    lineHeight: '1.6',
    outline: 'none',
  },
  viewerContent: {
    height: '100%',
    padding: '20px',
    borderRadius: '8px',
    overflow: 'auto',
  },
  preContent: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    fontFamily: "'Courier New', monospace",
    lineHeight: '1.6',
  },
};

// Export as ReportChat for backward compatibility with App.js
export default DocumentEditor;
