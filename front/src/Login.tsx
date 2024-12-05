import React, { useState } from "react";

interface LoginProps {
  onLogin: () => void; // for successful login
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = () => {
    // examples of some things we could have
    const userRegistry = [
      { username: "admin", password: "password!" },
      { username: "user", password: "password" },
    ];

    const validUser = userRegistry.find(
      (user) => user.username === username && user.password === password
    );

    if (validUser) {
      onLogin();
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
      <button onClick={onLogin}>Bypass Login</button>
    </div>
  );
};

export default Login;