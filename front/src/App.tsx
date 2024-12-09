import React, { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import Login from "./Login";
import Signup from "./Signup";
import axios from "axios";

const apiUrl = "http://34.199.154.104:8080";
// const apiUrl = "http://localhost:8080";

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
  const [userRegistry] = useState<{ username: string; password: string; isAdmin: boolean }[]>([]);
  const [files, setFiles] = useState<Package[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string>(""); 
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]); 
  const [showReauthButton, setShowReauthButton] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const [packageCost, setPackageCost] = useState<any>(null); 
  const [name, setName] = useState<string>(""); // Package name
  const [version, setVersion] = useState<string>(""); // Package version
  const [jsProgram, setJsProgram] = useState<string>(""); // Optional JS program
  const [debloat, setDebloat] = useState<boolean>(false);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [packageRating, setPackageRating] = useState(null); // store fetched rating
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("authToken");

      if (!token) {
        throw new Error("User is not authenticated.");
      }

      const cleanToken = token.replace(/^Bearer\s+/i, '');

      const queries = [{ Name: "*", version: undefined }];
      const response = await axios.post(`${apiUrl}/packages`, queries, {
        headers: {
          "X-Authorization": `Bearer ${cleanToken}`,
        },
      });

      setFiles(response.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        console.warn("Token is invalid. Show reauthentication button.");
        setShowReauthButton(true);
        const token = localStorage.getItem("authToken");
        console.log(token,"invalid token")
        setError("Your session has expired. Please reauthenticate.");
      } else if (error instanceof Error) {
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

  const handleLogin = (token: string, adminStatus: boolean) => {
    setIsAuthenticated(true);
    setIsAdmin(adminStatus); // Update isAdmin based on login
  };
  
  // const handleLogin = (token: string) => {
  //   localStorage.setItem("authToken", token);
  //   console.log("og token", token);
  //   setIsAuthenticated(true);
  //   setShowReauthButton(false);
  // };

  const handleSignupToggle = () => {
    setShowSignup((prev) => !prev);
  };

  const filteredFiles = files.filter((file) =>
    file.Name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const authenticate = async (username: string, password: string, isAdmin: boolean): Promise<string> => {
    try {
      const response = await axios.put(`${apiUrl}/authenticate`, {
        User: { name: username, isAdmin: isAdmin },
        Secret: { password: password },
      });

      const token = response.data.replace('"bearer ', "").replace('"', "");
      return token;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error("Authentication failed:", error.response?.data || error.message);
      } else if (error instanceof Error) {
        console.error("General error:", error.message);
      }
      throw new Error("Failed to authenticate. Please check your credentials.");
    }
  };

  const handleReauthentication = async () => {
    try {
      if (!username || !password) {
        setError("Please enter both username and password.");
        return;
      }

      const newToken = await authenticate(username, password, true); // Use the provided credentials
      setShowReauthButton(false);
      localStorage.setItem("authToken", newToken); // Store the new token
      console.log("new token", newToken)
      fetchFiles(); // Retry fetching files
    } catch (authError) {
      setError("Reauthentication failed. Please check your credentials.");
    }
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

  const handleReset = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No token found.");

      await axios.delete("http://localhost:8080/reset", {
        headers: { "X-Authorization": token },
      });

      alert("Registry reset successfully.");
    } catch (err) {
      console.error("Error resetting registry:", err);
      alert("Failed to reset registry.");
    }
  };

  const toggleSignupView = () => {
    setShowSignup(!showSignup);
  };

  const handleUrlSubmit = async () => {
    try {
      if (!url || !name || !version) {
        console.error("Name, Version, and URL are required.");
        return;
      }
  
      const token = localStorage.getItem("authToken");
      const cleanToken = token?.replace(/^Bearer\s+/i, '');
  
      if (!cleanToken) {
        console.error("Authorization token is missing or invalid.");
        return;
      }
  
      const fixedJsProgram = jsProgram.replace(/\\n/g, "\n").replace(/\\'/g, "'");
      // Don't manipulate the `jsProgram` string here. Just pass it as it is.
      const packageData = {
        Name: name,
        Version: version,
        URL: url,
        JSProgram: fixedJsProgram, // Send the raw JavaScript code
        debloat,
      };
  
      console.log("Sending package data:", packageData);
  
      // Here, you can directly send the data with JSON.stringify()
      const response = await fetch(`${apiUrl}/package`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Authorization": `Bearer ${cleanToken}`,
        },
        body: JSON.stringify(packageData), // Body is stringified correctly
      });
  
      if (response.ok) {
        const result = await response.json();
        console.log("Package uploaded successfully:", result);
      } else {
        const errorText = await response.text();
        console.error("Error uploading package:", errorText);
      }
    } catch (error) {
      console.error("Error submitting the package:", error);
    }
  };

  const handleZipFileSubmit = async () => {
    try {
      if (!zipFile || !name || !version) {
        console.error("Name, Version, and ZIP file are required.");
        return;
      }
  
      console.log("zip file", zipFile);
  
      // Convert the ZIP file to base64
      const base64Content = await fileToBase64(zipFile);
      
      const token = localStorage.getItem("authToken");
      const cleanToken = token?.replace(/^Bearer\s+/i, '');
  
      if (!cleanToken) {
        console.error("Authorization token is missing or invalid.");
        return;
      }
  
      // Prepare the package data with base64 content
      const packageData = {
        Name: name,        // Attach the package name
        Version: version,  // Attach the package version
        Content: base64Content,  // Attach the base64 content of the ZIP file
        JSProgram: jsProgram.replace(/\\n/g, "\n").replace(/\\'/g, "'"),  // Optional JS Program
      };
  
      console.log("Sending package data via ZIP file:", packageData);
  
      // Send the data to the server
      const response = await fetch(`${apiUrl}/package`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Authorization": `Bearer ${cleanToken}`,
        },
        body: JSON.stringify(packageData),  // Send the data as JSON
      });
  
      if (response.ok) {
        const result = await response.json();
        console.log("Package uploaded successfully via ZIP:", result);
      } else {
        const errorText = await response.text();
        console.error("Error uploading package via ZIP:", errorText);
      }
    } catch (error) {
      console.error("Error submitting the ZIP file package:", error);
    }
  };
  
  // Utility function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]); // Return only the base64 content, without the data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    try {
      if (url) {
        // Handle upload via URL
        await handleUrlSubmit();
      } else if (zipFile) {
        // Handle upload via ZIP file
        await handleZipFileSubmit();
      } else {
        console.error("Please provide either a URL or a ZIP file for upload.");
      }
    } catch (error) {
      console.error("Error during upload:", error);
    }
  };

  const handleDownload = async () => {
    if (!selectedPackageId) {
      return;
    }
  
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const cleanToken = token?.replace(/^Bearer\s+/i, '');
  
      const response = await axios.get(`${apiUrl}/package/${selectedPackageId}`, {
        headers: {
          "X-Authorization": `Bearer ${cleanToken}`,
        },
        responseType: 'arraybuffer' // Fetch binary data (zip)
      });
  
      const base64Content = response.data; // Assuming the server returns the binary content as a buffer
      
      // Convert buffer to a Blob
      const blob = new Blob([base64Content], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${response.data.metadata.Name}.zip`; // Download as zip file
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      setError("Error downloading package: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const fetchPackageCost = async () => {
    if (!selectedPackageId) {
      setError("Please select a package first.");
      return; // Exit if no package is selected
    }
  
    try {
      const token = localStorage.getItem("authToken");
      const cleanToken = token?.replace(/^Bearer\s+/i, '');
  
      if (!cleanToken) {
        setError("Authorization token is missing or invalid.");
        return;
      }
  
      const response = await axios.get(`${apiUrl}/package/${selectedPackageId}/cost?dependency=true`, {
        headers: {
          "X-Authorization": `Bearer ${cleanToken}`,
        },
      });
  
      if (response.status === 200) {
        setPackageCost(response.data[selectedPackageId]);
      } else {
        setError(`Failed to fetch package cost: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error fetching package cost:", error);
      setError("Error fetching package cost.");
    }
  };

  const fetchPackageRating = async () => {
    if (!selectedPackageId) {
      setError("Please select a package first.");
      return; // Exit if no package is selected
    }
  
    try {
      const token = localStorage.getItem("authToken");
      const cleanToken = token?.replace(/^Bearer\s+/i, '');
  
      if (!cleanToken) {
        setError("Authorization token is missing or invalid.");
        return;
      }
  
      const response = await axios.get(`${apiUrl}/package/${selectedPackageId}/rate`, {
        headers: {
          'X-Authorization': `Bearer ${cleanToken}`,
        },
      });
  
      if (response.status === 200) {
        setPackageRating(response.data);
      } else {
        setError(`Failed to fetch package rating: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error fetching package rating:", error);
      setError("Error fetching package rating.");
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFile = Array.from(e.dataTransfer.files).find(file => file.type === "application/zip");
      if (newFile) {
        setZipFile(newFile);  // Set the zip file state
        setFilesToUpload((prev) => [...prev, newFile]);
      }
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFile = Array.from(e.target.files).find(file => file.type === "application/zip");
      if (newFile) {
        setZipFile(newFile);  // Set the zip file state
        setFilesToUpload((prev) => [...prev, newFile]);
      }
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
            onLogin={handleLogin}
            onSignupClick={toggleSignupView}
            userRegistry={userRegistry}
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Package Name"
                disabled={loading}
                className="name-input"
              />
              
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="Enter Version"
                disabled={loading}
                className="version-input"
              />

              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL for ZIP"
                disabled={loading}
                className="url-input"
              />

              <input
                value={jsProgram}
                onChange={(e) => setJsProgram(e.target.value)}
                placeholder="Enter JS Program (Optional)"
                disabled={loading}
                className="jsprogram-input"
              ></input>

              <label className="debloat-toggle">
                <input
                  type="checkbox"
                  checked={debloat}
                  onChange={(e) => setDebloat(e.target.checked)}
                  disabled={loading}
                />
                Enable Debloating
              </label>

              <button onClick={handleUpload} disabled={loading}>
                Upload Package
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
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search packages..."
              />
              {loading && <p>Loading...</p>}
              <ul>
              {filteredFiles.length > 0 ? (
                filteredFiles.map((file) => (
                  <li key={file.ID}>
                    <input
                      type="radio"
                      name="package"
                      value={file.ID}
                      checked={selectedPackageId === file.ID}
                      onChange={() => setSelectedPackageId(file.ID)}
                    />
                    {file.Name} - Version: {typeof file.Version === "string" ? file.Version : file.Version.VersionNumber}
                  </li>
                ))
              ) : (
                <li>No matches</li>
              )}
              </ul>
              <button onClick={fetchFiles} disabled={loading}>
                Refresh List
              </button>

              {/* "Get Cost" Button */}
              {selectedPackageId && (
                <div>
                  <button onClick={fetchPackageCost} disabled={loading}>
                    Get Cost
                  </button>
                </div>
                
              )}

              {/* "Get Cost" Button */}
              {selectedPackageId && (
                <div>
                  <button onClick={fetchPackageRating}>Get Package Rating</button>
                </div>                
              )}

              {/* Display package cost */}
              {packageCost && (
                <div>
                  <h3>Package Cost:</h3>
                  <p>Standalone Cost: {packageCost.standaloneCost}</p>
                  <p>Total Cost: {packageCost.totalCost}</p>
                </div>
              )}

              {packageRating && (
                <div>
                  <h2>Package Rating:</h2>
                  <pre>{JSON.stringify(packageRating, null, 2)}</pre>
                </div>
              )}

              {/* Download Button */}
              {selectedPackageId && (
                <button onClick={handleDownload} disabled={loading}>
                  Download Package
                </button>
              )}
            </section>
          </div>

          {isAdmin && (
            <div className="admin-section">
              <h2>Admin Actions</h2>
              <button onClick={handleReset} className="reset-button">
                Reset Registry
              </button>
            </div>
          )}

          {showReauthButton && (
            <div className="reauth-section">
              <h3>Reauthenticate</h3>
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
              <button onClick={handleReauthentication}>Reauthenticate</button>
            </div>
          )}

          {error && <div className="error">{error}</div>}
        </>
      )}
    </div>
  );
};

export default App;
