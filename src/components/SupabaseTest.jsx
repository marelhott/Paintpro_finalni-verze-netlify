import React, { useState } from 'react';
import { testSupabaseConnection, testSupabaseTables } from '../utils/supabaseTest';

const SupabaseTest = () => {
  const [testResults, setTestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    setTestResults(null);

    console.log('🧪 Spouštím Supabase testy...');

    // Test základního připojení
    const connectionTest = await testSupabaseConnection();

    // Test tabulek
    const tablesTest = await testSupabaseTables();

    setTestResults({
      connection: connectionTest,
      tables: tablesTest
    });

    setIsLoading(false);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      right: '20px', 
      background: 'white', 
      padding: '20px', 
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      zIndex: 1000,
      maxWidth: '400px'
    }}>
      <h3>🔧 Supabase Diagnostika</h3>

      <button 
        onClick={runTests}
        disabled={isLoading}
        style={{
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? '⏳ Testuji...' : '🧪 Spustit test'}
      </button>

      {testResults && (
        <div style={{ marginTop: '15px' }}>
          <h4>📊 Výsledky:</h4>

          <div style={{ marginBottom: '10px' }}>
            <strong>Připojení:</strong>
            <div style={{ 
              color: testResults.connection.success ? 'green' : 'red',
              marginLeft: '10px'
            }}>
              {testResults.connection.success ? '✅ OK' : '❌ CHYBA'}
              {!testResults.connection.success && (
                <div style={{ fontSize: '12px', marginTop: '5px' }}>
                  {testResults.connection.error}: {testResults.connection.details}
                </div>
              )}
              {testResults.connection.success && (
                <div style={{ fontSize: '12px', marginTop: '5px' }}>
                  URL: {testResults.connection.url}
                </div>
              )}
            </div>
          </div>

          <div>
            <strong>Tabulky:</strong>
            <div style={{ marginLeft: '10px', fontSize: '14px' }}>
              <div>Users: {testResults.tables.users}</div>
              <div>Orders: {testResults.tables.orders}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
        Environment vars:
        <div>URL: {import.meta.env.VITE_SUPABASE_URL ? '✅' : '❌'}</div>
        <div>KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅' : '❌'}</div>
      </div>
    </div>
  );
};

export default SupabaseTest;