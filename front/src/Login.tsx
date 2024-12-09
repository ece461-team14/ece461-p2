import React, { useState } from "react";
import axios from "axios";

interface LoginProps {
  onLogin: (token: string, adminStatus: boolean) => void;
  onSignupClick: () => void;
  userRegistry: { username: string; password: string; isAdmin: boolean }[];
}

const Login: React.FC<LoginProps> = ({ onLogin, onSignupClick, userRegistry }) => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting login request...');
  
    try {
      const response = await axios.put(
        "http://localhost:8080/authenticate",
        {
          User: { name: username, isAdmin: isAdmin },
          Secret: { password: password },
        },
        { headers: { "Content-Type": "application/json" } }
      );
      console.log('Login response:', response.data); // Check the response
  
      const token = response.data;
      const jwtToken = token.split(' ')[1]; // Split the token (format: "bearer <token>")
      const base64Payload = jwtToken.split('.')[1];
      const decodedPayload = JSON.parse(atob(base64Payload));
  
      const adminStatus = decodedPayload.isAdmin;
  
      localStorage.setItem("authToken", token);
      localStorage.setItem("isAdmin", adminStatus.toString());
      onLogin(token, adminStatus); // Pass both token and admin status
    } catch (err) {
      console.error('Login error:', err); // Log error if login fails
      setError("Invalid username or password.");
    }
  };

  return (
    <div className="login-form">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label>
            Admin:
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
          </label>
        </div>
        <button type="submit">Login</button>
        <button type="button" onClick={onSignupClick}>
          Go to Signup
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default Login;