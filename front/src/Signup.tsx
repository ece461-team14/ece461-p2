import React, { useState } from "react";

interface SignupProps {
  onSignupComplete: () => void;
  addUser: (username: string, password: string) => Promise<void>;
}

const Signup: React.FC<SignupProps> = ({ onSignupComplete, addUser }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (username.length < 5) {
      setError("Username must be at least 5 characters long.");
      return;
    }
    if (password.length < 5) {
      setError("Password must be at least 5 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
        await addUser(username, password); // Now we await the promise
        onSignupComplete(); // Notify App to switch back to login
      } catch (error) {
        setError("Failed to sign up. Please try again later.");
      }
  };

  return (
    <div className="signup">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm Password"
          required
        />
        <button type="submit">Sign Up</button>
      </form>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
    </div>
  );
};

export default Signup;