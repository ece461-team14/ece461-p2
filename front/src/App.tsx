import React, { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import Login from "./Login";
import Signup from "./Signup";
import axios from "axios";

const apiUrl = "http://34.199.154.104:8080";

interface Package {
  Name: string;
  ID: string;
  Version: {
    VersionNumber: string;
  };
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [userRegistry, setUserRegistry] = useState<{ username: string; password: string }[]>([]);

  const [files, setFiles] = useState<Package[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string>(""); // To store URL input
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]); // Files to be uploaded
  const fileInputRef = useRef<HTMLInputElement>(null); // Reference for file input

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("authToken");

      if (!token) {
        setError("User is not authenticated.");
        setLoading(false);
        return;
      }

      const response = await axios.get(`${apiUrl}/packages`, {
        headers: {
          "Authorization": token,
        },
      });

      setFiles(response.data);
    } catch (error) {
      if (error instanceof Error) {
        setError(`Error fetching packages: ${error.message}`);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFiles();
    }
  }, [fetchFiles, isAuthenticated]);

  const handleLogin = (token: string) => {
    localStorage.setItem("authToken", token); // Store JWT token
    setIsAuthenticated(true); // Mark user as logged in
  };

  const handleSignupToggle = () => {
    setShowSignup((prev) => !prev); // Toggle between Login and Signup
  };

  const addUser = async (username: string, password: string): Promise<void> => {
    console.log("in here");
    try {
      const response = await fetch("http://localhost:8080/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        throw new Error("Failed to create user");
      }
  
      console.log("User created successfully");
    } catch (error) {
      console.error("Error adding user:", error);
      throw error; // Re-throw to allow the Signup component to catch it
    }
  };

  const handleUpload = async () => {
    try {
      setLoading(true);
      setError(null);

      // Upload files to the server (S3 bucket)
      const formData = new FormData();
      filesToUpload.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`${apiUrl}/upload`, {
        method: "POST",
        headers: { "X-Authorization": "your_auth_token" },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Refresh the list of available packages after uploading
      await fetchFiles();
      setFilesToUpload([]); // Clear the files to upload
    } catch (error) {
      if (error instanceof Error) {
        setError(`Error uploading files: ${error.message}`);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (url) {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiUrl}/fetchZip`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Authorization": "your_auth_token", // actual token
          },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ZIP from URL`);
        }

        const zipBlob = await response.blob();
        const zipFile = new Blob([zipBlob], { type: "application/zip" });
        const zipURL = URL.createObjectURL(zipFile);
        const link = document.createElement("a");
        link.href = zipURL;
        link.download = "downloaded_package.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        setError(`Error fetching ZIP from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    } else {
      setError("Please enter a valid URL.");
    }
  };

  // Handle file drop for drag-and-drop file upload
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFilesToUpload((prev) => [...prev, ...newFiles]);
    }
  };

  // Handle file drag over event
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Trigger the file input when the drop area is clicked
  const handleDropAreaClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file input change when a file is selected from file system
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFilesToUpload((prev) => [...prev, ...newFiles]);
    }
  };

  // Remove file from the filesToUpload list
  const handleRemoveFile = (file: File) => {
    setFilesToUpload((prev) => prev.filter((f) => f !== file));

  };
  
  return (
    <div className="App">
      {!isAuthenticated ? (
        showSignup ? (
          <Signup
            onSignupComplete={handleSignupToggle}
            addUser={addUser}
          />
        ) : (
          <Login
            onLogin={handleLogin} // Handle login and pass the token
            userRegistry={userRegistry}
            onSignupClick={handleSignupToggle}
          />
        )
      ) : (
        <>
          <header className="App-header">
            <h1 className="App-title">JJAB</h1>
            <p className="App-subtitle">A trustworthy package registry</p>
          </header>

          <div className="container">
            <section className="left-section">
              <h2>Upload Package</h2>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL for ZIP"
                disabled={loading}
                className="url-input"
              />
              <button onClick={handleUrlSubmit} disabled={loading}>
                Fetch ZIP from URL
              </button>

              <div
                className="file-drop-area"
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
                onClick={handleDropAreaClick}
              >
                <p>Drag and drop a file here, or click to select</p>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />

              {filesToUpload.length > 0 && (
                <div className="uploaded-files-box">
                  <h3>Files to Upload</h3>
                  <ul>
                    {filesToUpload.map((file, index) => (
                      <li key={index}>
                        {file.name}{" "}
                        <button onClick={() => handleRemoveFile(file)}>
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button onClick={handleUpload} disabled={loading}>
                    Upload Packages
                  </button>
                </div>
              )}
            </section>

            <section className="right-section">
              <h2>Available Packages</h2>
              {loading && <p>Loading...</p>}
              <ul>
                {files.map((file) => (
                  <li key={file.ID}>
                    {file.Name} - Version: {file.Version.VersionNumber}
                  </li>
                ))}
              </ul>
              <button onClick={fetchFiles} disabled={loading}>
                Refresh List
              </button>
            </section>
          </div>

          {error && <div className="error">{error}</div>}
        </>
      )}
    </div>
  );
};

export default App;