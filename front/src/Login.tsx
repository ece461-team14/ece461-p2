import React, { useState } from "react";
import axios from "axios";

interface LoginProps {
  onLogin: (token: string) => void;
  userRegistry: { username: string; password: string }[]; // Add this line
  onSignupClick: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSignupClick }) => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await axios.put(
        "http://localhost:8080/authenticate",
        {
          User: {
            name: username,
            isAdmin: isAdmin,
          },
          Secret: {
            password: password,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const token = response.data; // Assuming it returns "bearer token"
      localStorage.setItem("authToken", token); // Store token in local storage

      onLogin(token); // Mark the user as logged in
    } catch (err) {
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
            name="testUsername"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            name="testPassword"
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
              name="testCheckbox"
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
          </label>
        </div>
        <button name="submitButton" type="submit">Login</button>
        <button name="signupButton" type="button" onClick={onSignupClick}>
          Go to Signup
        </button>
      </form>
      {error && <p id="error" className="error">{error}</p>}
    </div>
  );
};

export default Login;