import React, {useState} from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  //--------------------------------
  // demo of API call:
  // State to store API response
  const [message, setMessage] = useState<string>('');

  // Function to call API on button press
  const fetchMessage = () => {
    fetch('http://localhost:8080/')
      .then(response => response.text())
      .then(data => setMessage(data))
      .catch(error => console.error('Error fetching message:', error));
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Press the button to get a message from the back-end:</p>
        <button onClick={fetchMessage}>Fetch Message</button>
        {message && <p>Back-end Response: {message}</p>}
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
  //--------------------------------

  // Auto-generated code from create-react-app
  // return (
  //   <div className="App">
  //     <header className="App-header">
  //       <img src={logo} className="App-logo" alt="logo" />
  //       <p>
  //         Edit <code>src/App.tsx</code> and save to reload.
  //       </p>
  //       <a
  //         className="App-link"
  //         href="https://reactjs.org"
  //         target="_blank"
  //         rel="noopener noreferrer"
  //       >
  //         Learn React
  //       </a>
  //     </header>
  //   </div>
  // );
}

export default App;
