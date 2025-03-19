'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';

export default function VisitApiTest() {
  const { user } = useAuth();
  const [authHeader, setAuthHeader] = useState({});
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [testResponse, setTestResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [visitId, setVisitId] = useState('');
  const [testStatus, setTestStatus] = useState('completed');

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
      console.log('API Response:', data);
      setApiResponse(data);

      // Auto-select first visit ID if available
      if (data && data.length > 0) {
        setVisitId(data[0].id || data[0]._id);
      }
    } catch (error: any) {
      setError(error.message);
      console.error('API Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const updateVisitStatus = async () => {
    if (!visitId) {
      setError('Select a visit ID first');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // First get the current visit data
      const getResponse = await fetch(`/api/visits/${visitId}`, {
        headers: {
          ...authHeader
        }
      });
      
      if (!getResponse.ok) {
        throw new Error(`Error fetching visit: ${getResponse.status} ${getResponse.statusText}`);
      }
      
      const currentVisit = await getResponse.json();
      console.log('Current visit:', currentVisit);
      
      // Update the visit status
      const updatedVisit = {
        ...currentVisit,
        status: testStatus.toLowerCase()
      };
      
      console.log('Sending updated visit:', updatedVisit);
      
      // Send the update
      const updateResponse = await fetch(`/api/visits/${visitId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify(updatedVisit)
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Update failed: ${updateResponse.status} ${errorText}`);
      }
      
      const result = await updateResponse.json();
      console.log('Update result:', result);
      setTestResponse(result);
      
      // Refresh the list
      fetchAllVisits();
      
    } catch (error: any) {
      setError(error.message);
      console.error('Update error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Visit API Test Tool</h1>
      
      <div className="mb-6">
        <button 
          onClick={fetchAllVisits}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        >
          Fetch All Visits
        </button>
        
        <div className="mt-4 mb-6 border rounded p-4">
          <h2 className="text-lg font-semibold mb-2">Update Visit Status</h2>
          <div className="flex items-center mb-4">
            <input
              type="text"
              value={visitId}
              onChange={(e) => setVisitId(e.target.value)}
              placeholder="Visit ID"
              className="border rounded p-2 mr-4 flex-grow"
            />
            <select 
              value={testStatus}
              onChange={(e) => setTestStatus(e.target.value)}
              className="border rounded p-2 mr-4"
            >
              <option value="scheduled">scheduled</option>
              <option value="in-progress">in-progress</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
            </select>
            <button
              onClick={updateVisitStatus}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Update Status
            </button>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-6">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {loading && (
        <div className="animate-pulse text-center p-4 mb-6">
          Loading...
        </div>
      )}
      
      {testResponse && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Update Result</h2>
          <div className="bg-green-50 p-4 rounded">
            <p className="font-medium">Visit updated successfully:</p>
            <p>New status: <span className="font-semibold">{testResponse.status}</span></p>
            <p>Visit ID: {testResponse.id || testResponse._id}</p>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(testResponse, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      {apiResponse && (
        <div>
          <h2 className="text-lg font-semibold mb-2">All Visits</h2>
          
          <div className="grid grid-cols-4 gap-x-6 gap-y-2 mb-4 text-sm font-medium">
            <div>Status</div>
            <div>Patient</div>
            <div>Date</div>
            <div>ID</div>
          </div>
          
          <div className="space-y-2">
            {apiResponse.map((visit: any) => (
              <div 
                key={visit.id || visit._id} 
                className="grid grid-cols-4 gap-x-6 gap-y-1 border p-3 rounded hover:bg-gray-50"
                onClick={() => setVisitId(visit.id || visit._id)}
              >
                <div>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold 
                    ${visit.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      visit.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      visit.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'}`}>
                    {visit.status}
                  </span>
                </div>
                <div>{visit.patientName}</div>
                <div>{new Date(visit.date).toLocaleString()}</div>
                <div className="text-xs text-gray-500 truncate">{visit.id || visit._id}</div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 mb-2 text-sm text-gray-600">
            <p>Total visits: {apiResponse.length}</p>
            <p>Status breakdown:</p>
            <ul className="list-disc pl-8">
              <li>Scheduled: {apiResponse.filter((v: any) => v.status?.toLowerCase() === 'scheduled').length}</li>
              <li>In Progress: {apiResponse.filter((v: any) => v.status?.toLowerCase() === 'in-progress').length}</li>
              <li>Completed: {apiResponse.filter((v: any) => v.status?.toLowerCase() === 'completed').length}</li>
              <li>Cancelled: {apiResponse.filter((v: any) => v.status?.toLowerCase() === 'cancelled').length}</li>
              <li>Other status: {apiResponse.filter((v: any) => !['scheduled', 'in-progress', 'completed', 'cancelled'].includes(v.status?.toLowerCase())).length}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
} 