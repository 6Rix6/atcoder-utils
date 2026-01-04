import React, { useState, useEffect, useMemo } from 'react';
import { DetailsResponse,SUPPORTED_LANGUAGES } from '../paizaApi';

const vscode = (window as any).acquireVsCodeApi();

const App = () => {
  const [language, setLanguage] = useState('');
  const [stdin, setStdin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetailsResponse | null>(null);

  useEffect(() => {
    // Handle messages from the extension host
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case 'loading':
          setIsLoading(message.loading);
          if (message.loading) setError(null);
          break;

        case 'result':
          setResult(message.result);
          setError(null);
          break;

        case 'error':
          setError(message.error);
          setResult(null);
          break;

        case 'setLanguage':
          setLanguage(message.language);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    getCurrentLanguage();

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRun = () => {
    if (vscode) {
      vscode.postMessage({
        command: 'run',
        language,
        input: stdin,
      });
    }
  };

  const getCurrentLanguage = () => {
    if (vscode) {
      vscode.postMessage({
        command: 'getCurrentLanguage',
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="container">
      <h1>Paiza Runner</h1>

      <div className="form-group">
        <label htmlFor="language">Language</label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="stdin">Standard Input (stdin)</label>
        <textarea
          id="stdin"
          placeholder="Enter input data here..."
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
        />
      </div>

      <button
        id="runBtn"
        className="btn"
        disabled={isLoading}
        onClick={handleRun}
      >
        <span className="btn-icon">▶</span>
        Run Code
      </button>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="loading active">
          <div className="spinner"></div>
          <span>Running on Paiza.io...</span>
        </div>
      )}

      {/* General Error Message */}
      {error && <div className="error-message active">{error}</div>}

      {/* Execution Results */}
      {result && (
        <div className="result-section">
          <div className="result-header">
            <span className="result-title">Execution Result</span>
            <span className="result-stats">
              Time: {(result.time * 1000).toFixed(0)}ms | Memory:{' '}
              {formatBytes(result.memory)}
            </span>
          </div>
          <span className={`status-badge ${result.result}`}>
            {result.result}
          </span>

          {/* Standard Output */}
          {result.stdout && (
            <div className="result-box">
              <div className="result-box-header stdout">Standard Output</div>
              <div className="result-content">{result.stdout}</div>
            </div>
          )}

          {/* Standard Error */}
          {result.stderr && (
            <div className="result-box">
              <div className="result-box-header stderr">Standard Error</div>
              <div className="result-content">{result.stderr}</div>
            </div>
          )}

          {/* Build Error */}
          {result.build_stderr && result.build_result !== 'success' && (
            <div className="result-box">
              <div className="result-box-header build-error">Build Error</div>
              <div className="result-content">{result.build_stderr}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;