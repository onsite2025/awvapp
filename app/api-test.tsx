'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';

export default function GeneralApiTest() {
  const { user } = useAuth();
  const [authHeader, setAuthHeader] = useState({});
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [visitIdToTest, setVisitIdToTest] = useState('');
  const [modifiedVisit, setModifiedVisit] = useState<any>(null);

  useEffect(() => {
    const setupAuth = async () => {
      if (!user) return;
      
      try {
        const { auth } = await import('./lib/firebase');
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          const token = await currentUser.getIdToken();
          setAuthHeader({
            'Authorization': `Bearer ${token}`
          });
        }
      } catch (error) {
        console.error('Error setting up auth:', error);
      }
    };
    
    setupAuth();
  }, [user]);

  const fetchAllVisits = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/visits', {
        headers: {
          ...authHeader
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Raw API response:', data);
      setApiResponse(data);
      
      if (data && data.length > 0) {
        setVisitIdToTest(data[0].id || data[0]._id);
      }
    } catch (error: any) {
      setError(error.message);
      console.error('API Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const testUpdateVisit = async (status: string) => {
    if (!visitIdToTest) {
      setError('No visit ID selected');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // First get the visit
      const getResponse = await fetch(`/api/visits/${visitIdToTest}`, {
        headers: {
          ...authHeader
        }
      });
      
      if (!getResponse.ok) {
        throw new Error(`Error fetching visit: ${getResponse.status} ${getResponse.statusText}`);
      }
      
      const visitData = await getResponse.json();
      console.log('Current visit data:', visitData);
      
      // Modify the visit status
      const updatedVisit = {
        ...visitData,
        status: status.toLowerCase()
      };
      
      // Update the visit
      const updateResponse = await fetch(`/api/visits/${visitIdToTest}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify(updatedVisit)
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Error response:', errorText);
        throw new Error(`Error updating visit: ${updateResponse.status} ${updateResponse.statusText}`);
      }
      
      const updatedData = await updateResponse.json();
      setModifiedVisit(updatedData);
      console.log('Updated visit:', updatedData);
      
      // Refresh the visits list
      fetchAllVisits();
      
    } catch (error: any) {
      setError(error.message);
      console.error('API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <div className="mb-6">
        <button 
          onClick={fetchAllVisits}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          Fetch All Visits
        </button>
      </div>
      
      {visitIdToTest && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Test Update Visit</h2>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={visitIdToTest}
              onChange={(e) => setVisitIdToTest(e.target.value)}
              className="border rounded px-2 py-1 flex-grow"
              placeholder="Visit ID"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => testUpdateVisit('scheduled')}
              className="bg-blue-500 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              Set to Scheduled
            </button>
            <button
              onClick={() => testUpdateVisit('in-progress')}
              className="bg-yellow-500 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              Set to In Progress
            </button>
            <button
              onClick={() => testUpdateVisit('completed')}
              className="bg-green-500 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              Set to Completed
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded">
          <h2 className="font-semibold">Error:</h2>
          <p>{error}</p>
        </div>
      )}
      
      {loading && (
        <div className="mb-6 p-4 bg-gray-100 rounded">
          Loading...
        </div>
      )}
      
      {modifiedVisit && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Modified Visit</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-40">
            {JSON.stringify(modifiedVisit, null, 2)}
          </pre>
        </div>
      )}
      
      {apiResponse && (
        <div>
          <h2 className="text-xl font-semibold mb-2">API Response</h2>
          <div className="space-y-2">
            <p>Total visits: {apiResponse.length}</p>
            <p>Status breakdown:</p>
            <ul className="list-disc pl-6">
              <li>Scheduled: {apiResponse.filter((v: any) => v.status?.toLowerCase() === 'scheduled').length}</li>
              <li>In Progress: {apiResponse.filter((v: any) => v.status?.toLowerCase() === 'in-progress').length}</li>
              <li>Completed: {apiResponse.filter((v: any) => v.status?.toLowerCase() === 'completed').length}</li>
              <li>Cancelled: {apiResponse.filter((v: any) => v.status?.toLowerCase() === 'cancelled').length}</li>
              <li>Other/Missing status: {apiResponse.filter((v: any) => !v.status || !['scheduled', 'in-progress', 'completed', 'cancelled'].includes(v.status.toLowerCase())).length}</li>
            </ul>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Visits List</h3>
            <div className="grid grid-cols-1 gap-4">
              {apiResponse.map((visit: any) => (
                <div key={visit.id || visit._id} className="border rounded p-4">
                  <div className="flex justify-between mb-2">
                    <h4 className="font-semibold">{visit.patientName}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      visit.status?.toLowerCase() === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      visit.status?.toLowerCase() === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                      visit.status?.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {visit.status || 'Unknown'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">ID: {visit.id || visit._id}</p>
                  <p className="text-sm text-gray-600">Template: {visit.templateName}</p>
                  <p className="text-sm text-gray-600">Date: {new Date(visit.date).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 