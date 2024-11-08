import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  //--------------------------------
  // State management for API responses and errors
  const [message, setMessage] = useState<string>('');
  const [tracks, setTracks] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Function to call the base API endpoint
  const fetchMessage = () => {
    setLoading(true);
    setError(null);
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/';

    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.text();
      })
      .then((data) => setMessage(data))
      .catch((error) => setError(`Error fetching message: ${error.message}`))
      .finally(() => setLoading(false));
  };

  // Function to call the "tracks" API endpoint
  const fetchTracks = () => {
    setLoading(true);
    setError(null);
    const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:8080/') + 'tracks';

    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
      })
      .then((data) => setTracks(JSON.stringify(data, null, 2)))
      .catch((error) => setError(`Error fetching tracks: ${error.message}`))
      .finally(() => setLoading(false));
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  // Function to call the "test_upload_file" endpoint
  const uploadFile = () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setLoading(true);
    setError(null);
    const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:8080/') + 'test_upload_file';

    const formData = new FormData();
    formData.append('file', file);

    fetch(apiUrl, {
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.text();
      })
      .then((data) => setMessage(`File uploaded successfully: ${data}`))
      .catch((error) => setError(`Error uploading file: ${error.message}`))
      .finally(() => {
        setLoading(false);
        setFile(null); // Reset file input after upload
      });
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Press the button to get a message from the back-end:</p>
        <button onClick={fetchMessage} disabled={loading}>
          {loading ? 'Loading...' : 'Fetch Message'}
        </button>
        {message && <p>Back-end Response: {message}</p>}

        <p>Press the button to get tracks from the back-end:</p>
        <button onClick={fetchTracks} disabled={loading}>
          {loading ? 'Loading...' : 'Fetch Tracks'}
        </button>
        {tracks && (
          <pre style={{ textAlign: 'left', backgroundColor: '#f0f0f0', padding: '10px' }}>
            Tracks Response: {tracks}
          </pre>
        )}

        {/* New file upload section */}
        <p>Choose a file to upload:</p>
        <input type="file" onChange={handleFileChange} />
        <button onClick={uploadFile} disabled={loading || !file}>
          {loading ? 'Uploading...' : 'Upload File'}
        </button>

        {error && <p style={{ color: 'red' }}>{error}</p>}
      </header>
    </div>
  );
}

export default App;
