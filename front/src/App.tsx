import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  //--------------------------------
  // State management for API responses and errors
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // THESE TWO BELOW ADDED IN COST PUSH
  const [cost, setCost] = useState<string | null>(null); // state for cost

  // BEGINNING OF ADDED STUFF FOR COST
  
  // handle getting the package ID
  // package cost getting function
  interface PackageCost {
    standaloneCost?: number;
    totalCost: number;
  }
  
  interface PackageCostResponse {
    [id: string]: PackageCost | string; // error messages ass trings
  }
  
  const testPackageIds: string[] = ['357898765', '988645763', '123456789']; // fake ids that dont exist
  
  const fetchTestPackageCosts = async (): Promise<void> => {
    setLoading(true);
    setError(null);
  
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/';
    
    // declare results
    const testResults: PackageCostResponse = {};
  
    const fetchCostForId = async (testId: string): Promise<void> => {
      try {
        const response = await fetch(`${apiUrl}package/${testId}/cost`, {
          method: 'GET',
          headers: {
            'X-Authorization': process.env.REACT_APP_AUTH_TOKEN || '', // need authtoken for this
          },
        });
  
        if (!response.ok) {
          testResults[testId] = `HTTP error! Status: ${response.status}`;
          return;
        }
  
        const data: unknown = await response.json();
  
        // validate cost shape
        if (isValidPackageCost(data)) {
          testResults[testId] = data;
        } else {
          testResults[testId] = `Unexpected response format for package ${testId}`;
        }
      } catch (error: any) {
        testResults[testId] = `Error fetching cost: ${error.message}`;
      }
    };
  
    try {
      await Promise.all(testPackageIds.map(fetchCostForId));
      setCost(JSON.stringify(testResults, null, 2)); // usr results here
    } catch (error: any) {
      setError(`Error fetching test package costs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  
  // Type guard to ensure the object matches the expected PackageCost shape
  const isValidPackageCost = (data: unknown): data is PackageCost => {
    return (
      typeof data === 'object' &&
      data !== null &&
      'totalCost' in data &&
      typeof (data as any).totalCost === 'number' &&
      ('standaloneCost' in data
        ? typeof (data as any).standaloneCost === 'number' || (data as any).standaloneCost === undefined
        : true)
    );
  };
  //END OF COST FUNCTION
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />

        {/* SECTION NEW FOR PACKAGE COST */}
        
        {/* New button for fetching package cost */}
        <>
          <p>Test Package IDs: {testPackageIds.join(', ')}</p>
          <button onClick={fetchTestPackageCosts} disabled={loading}>
            {loading ? 'Running Tests...' : 'Run Cost Fetch Tests (404 do not exist IDs)'}
          </button>
        </>
     
        {/* Display package cost */}
        {cost && (
          <pre style={{ textAlign: 'left', backgroundColor: '#f0f0f0', padding: '10px' }}>
            Test Results: {cost}
          </pre>
        )}
        {/*END OF NEW SECTION */}
        
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </header>
    </div>
  );
}

export default App;
