import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  //--------------------------------
  // Demo of API call:
  // State to store API response
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false); // State to track loading status
  const [error, setError] = useState<string | null>(null); // State to store error messages

  // Function to call API on button press
  const fetchMessage = () => {
    setLoading(true); // Set loading to true when fetching starts
    setError(null); // Reset error state


    // if .env NODE_ENV is 'production', use deployment URL. Else use localhost
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/';
    console.log('API URL:', apiUrl);

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
        setError(`Error fetching message: ${error.message}, APIurl ${apiUrl}`); // Capture and set error
        console.error('Error fetching message:', error);
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
        {error && <p style={{ color: 'red' }}>{error}</p>} {/* Display error messages */}
      </header>
    </div>
  );
  //--------------------------------
}

export default App;
