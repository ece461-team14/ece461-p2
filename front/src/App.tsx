import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  //--------------------------------
  // Demo of API calls:

  // State to store API response for the base message
  const [message, setMessage] = useState<string>('');
  // State to store API response for tracks
  const [tracks, setTracks] = useState<string>(''); // New state for tracks

  // State to track loading status
  const [loading, setLoading] = useState<boolean>(false);
  // State to store error messages
  const [error, setError] = useState<string | null>(null);

  // Function to call the base API endpoint on button press
  const fetchMessage = () => {
    setLoading(true); // Set loading to true when fetching starts
    setError(null); // Reset error state

    // Determine the API URL based on environment
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/';

    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`); // Handle non-200 responses
        }
        return response.text();
      })
      .then((data) => {
        setMessage(data);
        console.log('API Response:', data); // Log the API response
      })
      .catch((error) => {
        setError(`Error fetching message: ${error.message}, API URL: ${apiUrl}`); // Capture and set error
        console.error('Error fetching message:', error);
      })
      .finally(() => {
        setLoading(false); // Set loading to false when fetching is complete
      });
  };

  // New function to call the "tracks" API endpoint
  const fetchTracks = () => {
    setLoading(true); // Set loading to true when fetching starts
    setError(null); // Reset error state

    // Determine the API URL based on environment and append 'tracks' endpoint
    const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:8080/') + 'tracks';

    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`); // Handle non-200 responses
        }
        return response.json(); // Assuming the "tracks" endpoint returns JSON
      })
      .then((data) => {
        setTracks(JSON.stringify(data, null, 2)); // Store the tracks data as a formatted JSON string
        console.log('Tracks API Response:', data); // Log the tracks API response
      })
      .catch((error) => {
        setError(`Error fetching tracks: ${error.message}, API URL: ${apiUrl}`); // Capture and set error
        console.error('Error fetching tracks:', error);
      })
      .finally(() => {
        setLoading(false); // Set loading to false when fetching is complete
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

        {/* New button to fetch tracks */}
        <p>Press the button to get tracks from the back-end:</p>
        <button onClick={fetchTracks} disabled={loading}>
          {loading ? 'Loading...' : 'Fetch Tracks'}
        </button>
        {tracks && (
          <pre style={{ textAlign: 'left', backgroundColor: '#f0f0f0', padding: '10px' }}>
            Tracks Response: {tracks}
          </pre>
        )}

        {/* Display error messages */}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </header>
    </div>
  );
  //--------------------------------
}

export default App;
