'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  PencilSquareIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Define our interfaces
interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  mrn: string; // Medical Record Number
  insuranceProvider?: string;
  insuranceNumber?: string;
  lastVisitDate?: string;
  allergies?: string[];
  medications?: string[];
  notes?: string;
}

interface Visit {
  id: string;
  patientId: string;
  date: string;
  provider: string;
  type: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in-progress';
  notes?: string;
}

// Mock patient data
const mockPatient: Patient = {
  id: '1',
  name: 'Jane Cooper',
  dateOfBirth: '1987-04-15',
  gender: 'Female',
  email: 'jane.cooper@example.com',
  phone: '(555) 123-4567',
  address: '123 Main St, Anytown, CA 94523',
  mrn: 'MRN-10001',
  insuranceProvider: 'Blue Cross',
  insuranceNumber: 'BC-9876543',
  lastVisitDate: '2023-10-15',
  allergies: ['Penicillin', 'Sulfa drugs'],
  medications: ['Lisinopril 10mg daily', 'Metformin 500mg twice daily'],
  notes: 'Patient has a family history of diabetes. Has been managing hypertension for the past 5 years.'
};

// Mock visit history data
const mockVisits: Visit[] = [
  {
    id: 'v1',
    patientId: '1',
    date: '2023-10-15',
    provider: 'Dr. Smith',
    type: 'Annual Wellness Visit',
    status: 'completed',
    notes: 'Routine AWV performed. All vitals normal. Reviewed medications and preventive care recommendations.'
  },
  {
    id: 'v2',
    patientId: '1',
    date: '2022-10-10',
    provider: 'Dr. Smith',
    type: 'Annual Wellness Visit',
    status: 'completed',
    notes: 'Annual assessment completed. Patient reports occasional headaches. Recommended lifestyle modifications.'
  },
  {
    id: 'v3',
    patientId: '1',
    date: '2023-11-30',
    provider: 'Dr. Jones',
    type: 'Follow-up Visit',
    status: 'scheduled'
  }
];

type PageParams = {
  id: string;
};

export default function PatientDetailsPage({ params }: { params: PageParams }) {
  const patientId = params.id;
  
  // State
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'medical'>('overview');

  // Fetch patient data
  useEffect(() => {
    const fetchPatientData = async () => {
      setIsLoading(true);
      try {
        // In a real application, this would be an API call
        // For now, use mock data and simulate a network delay
        setTimeout(() => {
          // If the patient ID matches our mock data, use it
          if (patientId === mockPatient.id) {
            setPatient(mockPatient);
            setVisits(mockVisits);
          } else {
            // For demo, create a patient with the requested ID
            setPatient({
              ...mockPatient,
              id: patientId,
              name: `Patient ${patientId}`
            });
            setVisits(mockVisits.map(visit => ({ ...visit, patientId })));
          }
          setIsLoading(false);
        }, 800);
      } catch (error) {
        console.error('Error fetching patient data:', error);
        setError('Failed to load patient information');
        setIsLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId]);

  // Calculate age from date of birth
  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state
  if (error || !patient) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error || 'Patient not found'}</p>
            <div className="mt-4">
              <Link 
                href="/patients" 
                className="text-sm font-medium text-red-700 hover:text-red-600"
              >
                Return to patients list
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/patients"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Patients
        </Link>
      </div>
      
      {/* Patient header */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {calculateAge(patient.dateOfBirth)} years old • {patient.gender} • MRN: {patient.mrn}
            </p>
          </div>
          <div className="flex space-x-2">
            <Link
              href={`/visits/new?patientId=${patient.id}`}
              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              New Visit
            </Link>
            <Link
              href={`/patients/${patient.id}/edit`}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PencilSquareIcon className="h-4 w-4 mr-1" />
              Edit
            </Link>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } py-4 px-1 border-b-2 font-medium text-sm focus:outline-none`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('visits')}
            className={`${
              activeTab === 'visits'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } py-4 px-1 border-b-2 font-medium text-sm focus:outline-none`}
          >
            Visit History
          </button>
          <button
            onClick={() => setActiveTab('medical')}
            className={`${
              activeTab === 'medical'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } py-4 px-1 border-b-2 font-medium text-sm focus:outline-none`}
          >
            Medical Info
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Contact Information</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                      Phone
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.phone}</dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                      Email
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.email}</dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                      Address
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.address}</dd>
                  </div>
                </dl>
              </div>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Insurance Information</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <IdentificationIcon className="h-5 w-5 text-gray-400 mr-2" />
                      Provider
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {patient.insuranceProvider || 'Not specified'}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-2" />
                      Policy Number
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {patient.insuranceNumber || 'Not specified'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            
            {patient.notes && (
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Notes</h3>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                  <p className="text-sm text-gray-900 whitespace-pre-line">{patient.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Visits Tab */}
        {activeTab === 'visits' && (
          <div>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Visit History</h3>
                <Link
                  href={`/visits/new?patientId=${patient.id}`}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  New Visit
                </Link>
              </div>
              <div className="border-t border-gray-200">
                {visits.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {visits
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((visit) => (
                        <li key={visit.id}>
                          <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-blue-600 truncate">
                                  <Link href={`/visits/${visit.id}`}>
                                    {visit.type}
                                  </Link>
                                </p>
                                <div className="ml-2 flex-shrink-0">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      visit.status === 'completed'
                                        ? 'bg-green-100 text-green-800'
                                        : visit.status === 'scheduled'
                                        ? 'bg-blue-100 text-blue-800'
                                        : visit.status === 'in-progress'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-2 flex-shrink-0 flex">
                                <p className="text-sm text-gray-500">{formatDate(visit.date)}</p>
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-gray-500">
                                  Provider: {visit.provider}
                                </p>
                              </div>
                            </div>
                            {visit.notes && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-500 truncate">{visit.notes}</p>
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="px-4 py-5 sm:px-6 text-center">
                    <p className="text-sm text-gray-500">No visit history available for this patient.</p>
                    <div className="mt-4">
                      <Link
                        href={`/visits/new?patientId=${patient.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        Schedule First Visit
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Medical Info Tab */}
        {activeTab === 'medical' && (
          <div>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Allergies</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                {patient.allergies && patient.allergies.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {patient.allergies.map((allergy, index) => (
                      <li key={index} className="text-sm text-gray-900">{allergy}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No known allergies.</p>
                )}
              </div>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Medications</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                {patient.medications && patient.medications.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {patient.medications.map((medication, index) => (
                      <li key={index} className="text-sm text-gray-900">{medication}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No current medications.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 