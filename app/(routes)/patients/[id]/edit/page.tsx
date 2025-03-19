'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PatientForm from '../../../../components/PatientForm';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import PageNavigation from '../../../../components/PageNavigation';

// Mock patient data (in a real app, this would be fetched from an API)
const mockPatient = {
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
  allergies: ['Penicillin', 'Sulfa drugs'],
  medications: ['Lisinopril 10mg daily', 'Metformin 500mg twice daily'],
  notes: 'Patient has a family history of diabetes. Has been managing hypertension for the past 5 years.'
};

interface PageParams {
  id: string;
}

interface Props {
  params: PageParams;
  searchParams?: { [key: string]: string | string[] | undefined };
}

const EditPatientPage: React.FC<Props> = ({ params }) => {
  const patientId = params.id;
  const router = useRouter();
  
  const [patient, setPatient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatient = async () => {
      setIsLoading(true);
      try {
        // In a real application, this would be an API call
        // For now, we'll use mock data and simulate a network delay
        setTimeout(() => {
          if (patientId === mockPatient.id) {
            setPatient(mockPatient);
          } else {
            // For demo purposes, create a patient with the requested ID
            setPatient({
              ...mockPatient,
              id: patientId,
              name: `Patient ${patientId}`
            });
          }
          setIsLoading(false);
        }, 800);
      } catch (error) {
        console.error('Error fetching patient:', error);
        setError('Failed to load patient data');
        setIsLoading(false);
      }
    };

    fetchPatient();
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
          href={`/patients/${patientId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Patient
        </Link>
      </div>
      
      <PageNavigation />
      
      <PatientForm initialData={patient} isEditing={true} />
    </div>
  );
};

export default EditPatientPage; 