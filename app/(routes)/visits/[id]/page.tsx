'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useToast } from '@/app/hooks/useToast';
import { 
  ClipboardDocumentCheckIcon, 
  ChevronLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

// Visit details page
export default function VisitDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  
  // For compatibility with current Next.js version, handle params safely
  const visitId = typeof params?.id === 'string' ? params.id : '';
  
  // State
  const [visit, setVisit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load data on component mount
  useEffect(() => {
    loadVisitData();
  }, [visitId]);
  
  // Function to load visit data
  const loadVisitData = async () => {
    if (!visitId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/visits/${visitId}`);
      setVisit(response.data);
      console.log('Visit data loaded:', response.data);
    } catch (error: any) {
      console.error('Failed to load visit data:', error);
      setError(`Failed to load visit: ${error.message || 'Unknown error'}`);
      toast.error('Error loading visit details');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <ClockIcon className="h-4 w-4 mr-1" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status || 'Unknown'}
          </span>
        );
    }
  };
  
  // Component rendering
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-lg text-gray-600">Loading visit details...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-4 max-w-lg w-full">
          <h2 className="text-lg font-semibold mb-2">Error Loading Visit</h2>
          <p>{error}</p>
        </div>
        <button 
          onClick={loadVisitData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
        <button 
          onClick={() => router.push('/visits')}
          className="mt-3 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to Visits
        </button>
      </div>
    );
  }
  
  if (!visit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">No visit data available. Please try again.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with back button */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.push('/visits')}
            className="inline-flex items-center text-gray-600 hover:text-gray-800"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Back to Visits
          </button>
          
          {/* Status badge */}
          {getStatusBadge(visit.status)}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mt-4">
          Visit Details
        </h1>
      </div>
      
      {/* Visit Details Card */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {visit.patientName}
              </h2>
              <p className="text-gray-600 mt-1">
                {formatDate(visit.date)}
              </p>
            </div>
            
            <div className="mt-4 md:mt-0">
              <Link 
                href={`/visits/${visitId}/edit`}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit Visit
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-2">Visit Information</h3>
              <dl className="space-y-1">
                <div className="flex">
                  <dt className="w-32 text-gray-500">Template:</dt>
                  <dd className="flex-1 text-gray-800">{visit.templateName || 'N/A'}</dd>
                </div>
                <div className="flex">
                  <dt className="w-32 text-gray-500">Provider:</dt>
                  <dd className="flex-1 text-gray-800">{visit.providerName || 'N/A'}</dd>
                </div>
                <div className="flex">
                  <dt className="w-32 text-gray-500">Created:</dt>
                  <dd className="flex-1 text-gray-800">{visit.createdAt ? formatDate(visit.createdAt) : 'N/A'}</dd>
                </div>
                <div className="flex">
                  <dt className="w-32 text-gray-500">Updated:</dt>
                  <dd className="flex-1 text-gray-800">{visit.updatedAt ? formatDate(visit.updatedAt) : 'N/A'}</dd>
                </div>
              </dl>
            </div>
            
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-2">Actions</h3>
              <div className="space-y-3">
                {/* Continue Visit button */}
                {visit.status === 'in_progress' && (
                  <Link 
                    href={`/visits/${visitId}/questions`}
                    className="block w-full md:w-auto text-center md:inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Continue Visit
                  </Link>
                )}
                
                {/* View Response Summary button */}
                <Link 
                  href={`/visits/${visitId}/summary`}
                  className="block w-full md:w-auto text-center md:inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  View Response Summary
                </Link>
                
                {/* Personalized Health Plan button - only for completed visits */}
                {visit.status === 'completed' && (
                  <Link 
                    href={`/visits/${visitId}/plan`}
                    className="block w-full md:w-auto text-center md:inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2" />
                    View Health Plan
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Response Cards (if available) */}
      {visit.responses && visit.responses.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Responses</h2>
          <div className="space-y-4">
            {visit.responses.map((response: any, index: number) => (
              <div key={index} className="bg-white shadow rounded-md p-4">
                <h3 className="font-medium text-gray-800">{response.question?.text || 'Question'}</h3>
                <p className="mt-2 text-gray-600">
                  {typeof response.answer === 'string' || typeof response.answer === 'number' 
                    ? response.answer 
                    : JSON.stringify(response.answer)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        visit.status !== 'completed' && (
          <div className="bg-yellow-50 p-4 rounded-md flex items-start mt-8">
            <ExclamationCircleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
            <div>
              <h3 className="font-medium text-yellow-800">No responses yet</h3>
              <p className="text-yellow-700 mt-1">
                This visit has no responses yet. {visit.status === 'in_progress' && 'Continue the visit to add responses.'}
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
} 