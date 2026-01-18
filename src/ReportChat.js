import React, { useState, useEffect, useRef } from 'react';
import { useTTS } from './hooks/useTTS';

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
  const [passwordInput, setPasswordInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [appendCodeInput, setAppendCodeInput] = useState('');

  const textareaRef = useRef(null);

  // TTS hook
  const tts = useTTS();

  // Load text into TTS when file selection changes
  useEffect(() => {
    if (selectedFile && files[selectedFile]) {
      tts.loadText(files[selectedFile]);
    } else {
      tts.loadText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile, files[selectedFile]]);

  // Check if running on localhost
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Auto-authenticate on localhost
  useEffect(() => {
    if (isLocalhost) {
      setIsAuthenticated(true);
      setAccessCode('localhost');
    }
  }, [isLocalhost]);

  // Load files on mount
  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load files from API or localStorage
  const loadFiles = async () => {
    setIsLoading(true);
    try {
      if (isLocalhost) {
        // Use localStorage on localhost
        const storedFiles = localStorage.getItem('localFiles');
        const localFiles = storedFiles ? JSON.parse(storedFiles) : {};
        setFiles(localFiles);
        const filenames = Object.keys(localFiles);
        if (filenames.length > 0 && !selectedFile) {
          setSelectedFile(filenames[0]);
        }
      } else {
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
      }
    } catch (err) {
      console.error('Error loading files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Unlock with access code
  const unlockAccess = async () => {
    if (!passwordInput.trim()) return;

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: passwordInput }),
      });

      if (response.ok) {
        setAccessCode(passwordInput);
        setIsAuthenticated(true);
        setPasswordInput('');
      } else {
        alert('Invalid access code');
        setPasswordInput('');
      }
    } catch (err) {
      alert('Error validating access code');
      setPasswordInput('');
    }
  };

  // Handle password input key press
  const handlePasswordKeyPress = (e) => {
    if (e.key === 'Enter') {
      unlockAccess();
    }
  };

  // Create new file
  const createNewFile = () => {
    if (!isLocalhost && !isAuthenticated) {
      alert('Please unlock first using the access code');
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
    const newFiles = { ...files, [finalName]: '' };
    setFiles(newFiles);
    if (isLocalhost) {
      localStorage.setItem('localFiles', JSON.stringify(newFiles));
    }
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

    // Log blob information for external app integration
    const blobKey = `docs/${filename}`;
    const currentContent = files[filename] || '';
    console.log('=== BLOB INFO FOR SELECTED FILE ===');
    console.log({
      // Key info needed to fetch/update this file
      filename: filename,
      blobKey: blobKey,                    // Full key in Vercel Blob storage

      // API endpoints
      fetchEndpoint: '/api/files',         // GET to fetch all files
      saveEndpoint: '/api/files',          // POST to save/update

      // Request body structure for saving/appending
      saveRequestBody: {
        filename: filename,
        content: '<your_content_here>',    // Replace with actual content
        accessCode: '<your_access_code>',  // Required for auth
      },

      // For appending to existing content
      appendExample: {
        filename: filename,
        content: currentContent + '\n<appended_content>',
        accessCode: '<your_access_code>',
      },

      // Current state
      currentContent: currentContent,
      contentLength: currentContent.length,
      exists: currentContent.length > 0,
    });
    console.log('=== END BLOB INFO ===');

    setSelectedFile(filename);
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  // Enter edit mode
  const enterEditMode = () => {
    if (!isAuthenticated) {
      alert('Please unlock first using the access code');
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

  // Save file to API or localStorage
  const saveFile = async () => {
    if (!selectedFile) return;
    if (!isLocalhost && !accessCode) return;

    setIsSaving(true);
    try {
      if (isLocalhost) {
        // Save to localStorage on localhost
        const newFiles = { ...files, [selectedFile]: editContent };
        localStorage.setItem('localFiles', JSON.stringify(newFiles));
        setFiles(newFiles);
        setOriginalContent(editContent);
        setHasUnsavedChanges(false);
        setIsEditing(false);
        alert('File saved locally!');
      } else {
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
      }
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Append clipboard to current document
  const appendClipboard = async () => {
    // Validate code (skip on localhost)
    if (!isLocalhost && appendCodeInput !== '123') {
      alert('Invalid code - enter 123');
      return;
    }

    // Check if a file is selected
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    try {
      // Read clipboard
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText) {
        alert('Clipboard is empty');
        return;
      }

      // Get current content
      const currentContent = files[selectedFile] || '';
      const newContent = currentContent + '\n\n' + clipboardText;

      setIsSaving(true);

      if (isLocalhost) {
        // Save to localStorage on localhost
        const newFiles = { ...files, [selectedFile]: newContent };
        localStorage.setItem('localFiles', JSON.stringify(newFiles));
        setFiles(newFiles);
        setOriginalContent(newContent);
        setHasUnsavedChanges(false);
        setIsSaving(false);
        setAppendCodeInput('');
        alert('Clipboard content appended locally!');
      } else {
        const response = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: selectedFile,
            content: newContent,
            accessCode: '123', // Use 123 as the access code for append
          }),
        });

        if (response.ok) {
          // Update local state immediately for instant UI update
          setFiles(prev => ({ ...prev, [selectedFile]: newContent }));
          setOriginalContent(newContent);
          setHasUnsavedChanges(false);
          setIsSaving(false);
          setAppendCodeInput(''); // Clear the input

          alert('Clipboard content appended and saved!');
        } else {
          const data = await response.json();
          alert('Error saving: ' + (data.error || 'Unknown error'));
          setIsSaving(false);
        }
      }
    } catch (err) {
      alert('Error appending clipboard: ' + err.message);
      setIsSaving(false);
    }
  };

  // Delete file
  const deleteFile = async (filename) => {
    if (!isLocalhost && !isAuthenticated) {
      alert('Please unlock first using the access code');
      return;
    }

    if (!window.confirm(`Delete "${filename}"?`)) return;

    try {
      if (isLocalhost) {
        // Delete from localStorage on localhost
        const newFiles = { ...files };
        delete newFiles[filename];
        localStorage.setItem('localFiles', JSON.stringify(newFiles));
        setFiles(newFiles);
        if (selectedFile === filename) {
          const remaining = Object.keys(newFiles);
          setSelectedFile(remaining[0] || null);
        }
        setIsEditing(false);
      } else {
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
      {showSidebar && (
        <div style={{
          ...styles.sidebar,
          background: darkMode ? '#1a1a2e' : '#f5f5f5',
        }}>
          <div style={{
            ...styles.sidebarHeader,
            background: darkMode ? '#0d0d1a' : '#e0e0e0',
            color: darkMode ? '#4da6ff' : '#333',
          }}>
            <span>DOCUMENTS</span>
            {/* Close sidebar button */}
            <button
              onClick={() => setShowSidebar(false)}
              style={styles.closeSidebarBtn}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* New File Button */}
          <button
            onClick={createNewFile}
            style={styles.newFileBtn}
          >
            + New File
          </button>

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
      )}

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
          {/* Hamburger menu button */}
          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              style={{
                ...styles.hamburgerBtn,
                color: darkMode ? '#fff' : '#333',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <span style={{
            ...styles.currentFileName,
            color: darkMode ? '#fff' : '#333',
          }}>
            {selectedFile || 'Select a file'}
            {hasUnsavedChanges && ' *'}
          </span>

          <div style={styles.controls}>
            {/* Copy Button */}
            <button
              onClick={() => {
                if (selectedFile && files[selectedFile]) {
                  navigator.clipboard.writeText(files[selectedFile]);
                }
              }}
              disabled={!selectedFile}
              style={{
                ...styles.copyBtn,
                opacity: !selectedFile ? 0.5 : 1,
              }}
            >
              Copy
            </button>

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

            {/* Font Size Increase */}
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

            {/* Append Clipboard Section */}
            <input
              type="text"
              value={appendCodeInput}
              onChange={(e) => setAppendCodeInput(e.target.value)}
              placeholder="123"
              autoComplete="off"
              style={styles.appendInput}
            />
            <button
              onClick={appendClipboard}
              disabled={!selectedFile || isSaving}
              style={{
                ...styles.appendBtn,
                opacity: (!selectedFile || isSaving) ? 0.5 : 1,
              }}
            >
              Append
            </button>

            {/* Unlock Input */}
            {!isAuthenticated ? (
              <>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyPress={handlePasswordKeyPress}
                  placeholder="Access code"
                  autoComplete="off"
                  style={styles.unlockInput}
                />
                <button
                  onClick={unlockAccess}
                  style={styles.unlockBtn}
                >
                  🔓
                </button>
              </>
            ) : (
              <span style={styles.unlockedBadge}>✓ Unlocked</span>
            )}

            {/* TTS Controls - Compact */}
            <div style={styles.ttsControls}>
              <span style={styles.ttsHint}>highlight & ▶ ✔</span>
              <button
                onClick={tts.prevSentence}
                disabled={tts.currentSentenceIndex === 0}
                style={styles.ttsNavBtn}
                title="Previous [">
                [
              </button>
              <span style={styles.ttsIndicator}>{tts.sentenceIndicator}</span>
              <button
                onClick={tts.nextSentence}
                disabled={tts.currentSentenceIndex >= tts.sentences.length - 1}
                style={styles.ttsNavBtn}
                title="Next ]">
                ]
              </button>
              <button
                onClick={() => {
                  if (tts.isPlaying) {
                    tts.stop();
                  } else {
                    const selection = window.getSelection().toString().trim();
                    if (selection && selection.length > 1) {
                      const found = tts.playFromSelection(selection);
                      if (!found) tts.play();
                    } else {
                      tts.play();
                    }
                  }
                }}
                style={styles.ttsPlayBtn}
                title={tts.isPlaying ? 'Stop' : 'Play'}>
                {tts.isPlaying ? '⏹' : '▶'}
              </button>
              <select
                value={tts.speed}
                onChange={(e) => tts.setSpeed(parseFloat(e.target.value))}
                style={styles.ttsSelect}
                title="Speed">
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
              <select
                value={tts.language}
                onChange={(e) => tts.setLanguage(e.target.value)}
                style={styles.ttsSelect}
                title="Language">
                <option value="en-US">EN</option>
                <option value="zh-HK">粵</option>
                <option value="zh-CN">普</option>
                <option value="es-ES">ES</option>
                <option value="he-IL">HE</option>
                <option value="ko-KR">KO</option>
              </select>
              <input
                type="number"
                value={tts.sentenceCount}
                onChange={(e) => tts.setSentenceCount(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                style={styles.ttsCountInput}
                title="Sentences to read"
              />
              <button
                onClick={() => tts.setRepeatMode(tts.repeatMode === 'continue' ? 'repeat' : 'continue')}
                style={{
                  ...styles.ttsRepeatBtn,
                  background: tts.repeatMode === 'repeat' ? '#ff9800' : '#555',
                }}
                title={tts.repeatMode === 'continue' ? 'Mode: Continue' : 'Mode: Repeat'}>
                {tts.repeatMode === 'continue' ? '→' : '↻'}
              </button>
            </div>
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
  unlockInput: {
    width: '80px',
    padding: '5px 8px',
    fontSize: '12px',
    border: '1px solid #333',
    borderRadius: '4px',
    background: '#2a2a2a',
    color: 'white',
    outline: 'none',
  },
  unlockBtn: {
    width: '28px',
    height: '28px',
    background: '#ff9800',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedBadge: {
    padding: '4px 8px',
    background: '#4caf50',
    color: 'white',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  appendInput: {
    width: '50px',
    padding: '5px 8px',
    fontSize: '12px',
    border: '1px solid #ff9800',
    borderRadius: '4px',
    background: '#2a2a2a',
    color: 'white',
    outline: 'none',
  },
  appendBtn: {
    padding: '6px 10px',
    background: '#ff5722',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '250px',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #333',
    zIndex: 100,
  },
  sidebarHeader: {
    padding: '15px 10px',
    fontSize: '14px',
    fontWeight: 'bold',
    borderBottom: '1px solid #333',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeSidebarBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '5px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'inherit',
  },
  hamburgerBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'inherit',
    marginRight: '10px',
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
    justifyContent: 'flex-start',
    gap: '8px',
    padding: '8px 12px',
    flexWrap: 'wrap',
  },
  currentFileName: {
    fontSize: '16px',
    fontWeight: '500',
  },
  controls: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  copyBtn: {
    padding: '6px 12px',
    background: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  editBtn: {
    padding: '6px 12px',
    background: '#9c27b0',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '6px 12px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '6px 12px',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '6px 10px',
    background: '#e91e63',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  fontBtn: {
    width: '28px',
    height: '28px',
    background: '#4da6ff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentArea: {
    flex: 1,
    padding: '10px',
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
    padding: '12px',
    border: 'none',
    borderRadius: '6px',
    resize: 'none',
    fontFamily: "'Courier New', monospace",
    lineHeight: '1.6',
    outline: 'none',
  },
  viewerContent: {
    height: '100%',
    padding: '12px',
    borderRadius: '6px',
    overflow: 'auto',
  },
  preContent: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    fontFamily: "'Courier New', monospace",
    lineHeight: '1.6',
  },
  // TTS Styles
  ttsControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: '8px',
    padding: '4px 8px',
    background: 'rgba(50, 50, 50, 0.8)',
    borderRadius: '4px',
  },
  ttsHint: {
    fontSize: '10px',
    color: '#8bc34a',
    marginRight: '4px',
    fontStyle: 'italic',
  },
  ttsNavBtn: {
    width: '24px',
    height: '24px',
    background: '#555',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ttsIndicator: {
    fontSize: '11px',
    color: '#aaa',
    minWidth: '40px',
    textAlign: 'center',
  },
  ttsPlayBtn: {
    width: '28px',
    height: '24px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ttsSelect: {
    padding: '3px 4px',
    fontSize: '11px',
    background: '#333',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  ttsCountInput: {
    width: '32px',
    padding: '3px 4px',
    fontSize: '11px',
    background: '#333',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '3px',
    textAlign: 'center',
  },
  ttsRepeatBtn: {
    width: '24px',
    height: '24px',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

// Export as ReportChat for backward compatibility with App.js
export default DocumentEditor;
