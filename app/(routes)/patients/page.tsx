"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  ChevronDownIcon,
  EllipsisHorizontalIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import PageNavigation from '../../components/PageNavigation';

// Define our Patient interface
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
}

// Mock data for patients
const mockPatients: Patient[] = [
  {
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
    lastVisitDate: '2023-10-15'
  },
  {
    id: '2',
    name: 'Michael Johnson',
    dateOfBirth: '1975-08-22',
    gender: 'Male',
    email: 'michael.johnson@example.com',
    phone: '(555) 234-5678',
    address: '456 Oak Ave, Somewhere, CA 94524',
    mrn: 'MRN-10002',
    insuranceProvider: 'Aetna',
    insuranceNumber: 'AT-1234567',
    lastVisitDate: '2023-09-28'
  },
  {
    id: '3',
    name: 'Sophia Rodriguez',
    dateOfBirth: '1990-11-30',
    gender: 'Female',
    email: 'sophia.rodriguez@example.com',
    phone: '(555) 345-6789',
    address: '789 Pine St, Elsewhere, CA 94525',
    mrn: 'MRN-10003',
    insuranceProvider: 'Medicare',
    insuranceNumber: 'MC-7654321',
    lastVisitDate: '2023-11-05'
  },
  {
    id: '4',
    name: 'David Lee',
    dateOfBirth: '1982-02-10',
    gender: 'Male',
    email: 'david.lee@example.com',
    phone: '(555) 456-7890',
    address: '101 Maple Dr, Nowhere, CA 94526',
    mrn: 'MRN-10004',
    insuranceProvider: 'Kaiser',
    insuranceNumber: 'KP-2468135',
    lastVisitDate: '2023-10-22'
  },
  {
    id: '5',
    name: 'Emily Wilson',
    dateOfBirth: '1995-06-18',
    gender: 'Female',
    email: 'emily.wilson@example.com',
    phone: '(555) 567-8901',
    address: '202 Cedar Ln, Anywhere, CA 94527',
    mrn: 'MRN-10005',
    insuranceProvider: 'United Healthcare',
    insuranceNumber: 'UH-1357924',
    lastVisitDate: '2023-11-12'
  }
];

export default function PatientsPage() {
  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [patientsPerPage] = useState(10);
  const [sortField, setSortField] = useState<keyof Patient>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  // Load patient data
  useEffect(() => {
    const loadPatients = async () => {
      setIsLoading(true);
      try {
        // Fetch patients from API
        const response = await fetch('/api/patients');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        
        const data = await response.json();
        setPatients(data);
        setFilteredPatients(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading patients:', error);
        setError('Failed to load patient data. Please try refreshing the page.');
        setIsLoading(false);
      }
    };

    loadPatients();
  }, []);

  // Filter patients based on search term
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredPatients(patients);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = patients.filter(
        patient => 
          patient.name.toLowerCase().includes(lowercaseSearch) ||
          patient.email.toLowerCase().includes(lowercaseSearch) ||
          patient.mrn.toLowerCase().includes(lowercaseSearch) ||
          (patient.phone && patient.phone.includes(searchTerm))
      );
      setFilteredPatients(filtered);
    }
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [searchTerm, patients]);

  // Sorting function
  const handleSort = (field: keyof Patient) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);

    const sorted = [...filteredPatients].sort((a, b) => {
      const valueA = a[field] || '';
      const valueB = b[field] || '';
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return newDirection === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      
      return 0;
    });

    setFilteredPatients(sorted);
  };

  // Pagination
  const indexOfLastPatient = currentPage * patientsPerPage;
  const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
  const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);
  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);

  // Handle pagination
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

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

  // Handle patient deletion
  const confirmDelete = (patient: Patient) => {
    setPatientToDelete(patient);
    setShowDeleteModal(true);
  };

  const deletePatient = async () => {
    if (!patientToDelete) return;
    
    try {
      // Get the current user's token from Firebase if available
      let authHeader = {};
      const { auth } = await import('../../lib/firebase');
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const token = await currentUser.getIdToken();
        authHeader = {
          'Authorization': `Bearer ${token}`
        };
      }
      
      // Delete patient via API
      const response = await fetch(`/api/patients/${patientToDelete.id}`, {
        method: 'DELETE',
        headers: {
          ...authHeader
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      // Remove from local state
      setPatients(prev => prev.filter(p => p.id !== patientToDelete.id));
      setShowDeleteModal(false);
      setPatientToDelete(null);
      // Show a success toast or notification here
    } catch (error) {
      console.error('Error deleting patient:', error);
      // Show error notification
    }
  };

  // Toggle dropdown menu for a patient
  const toggleDropdown = (patientId: string) => {
    if (showDropdown === patientId) {
      setShowDropdown(null);
    } else {
      setShowDropdown(patientId);
    }
  };

  // Delete confirmation modal
  const renderDeleteModal = () => (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Patient</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete {patientToDelete?.name}? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={deletePatient}
            >
              Delete
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageNavigation 
        title="Patients"
        breadcrumbs={[{ name: 'Patients', href: '/patients', current: true }]}
      />
      
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <p className="mt-1 text-sm text-gray-500">
            Manage your patient records and health information
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/patients/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add Patient
          </Link>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mb-6 bg-white p-4 shadow sm:rounded-lg">
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search by name, email, phone or MRN"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {filteredPatients.length} {filteredPatients.length === 1 ? 'patient' : 'patients'}
            </span>
          </div>
        </div>
      </div>

      {/* Patient table */}
      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Patient
                        {sortField === 'name' && (
                          <ChevronDownIcon
                            className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`}
                          />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('mrn')}
                    >
                      <div className="flex items-center">
                        MRN
                        {sortField === 'mrn' && (
                          <ChevronDownIcon
                            className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`}
                          />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('dateOfBirth')}
                    >
                      <div className="flex items-center">
                        DOB / Age
                        {sortField === 'dateOfBirth' && (
                          <ChevronDownIcon
                            className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`}
                          />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('phone')}
                    >
                      <div className="flex items-center">
                        Contact
                        {sortField === 'phone' && (
                          <ChevronDownIcon
                            className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`}
                          />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('lastVisitDate')}
                    >
                      <div className="flex items-center">
                        Last Visit
                        {sortField === 'lastVisitDate' && (
                          <ChevronDownIcon
                            className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`}
                          />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPatients.length > 0 ? (
                    currentPatients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                              <div className="text-sm text-gray-500">{patient.gender}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{patient.mrn}</div>
                          <div className="text-sm text-gray-500">{patient.insuranceProvider || 'No insurance'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(patient.dateOfBirth)}</div>
                          <div className="text-sm text-gray-500">{calculateAge(patient.dateOfBirth)} years</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{patient.phone}</div>
                          <div className="text-sm text-gray-500">{patient.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {patient.lastVisitDate ? formatDate(patient.lastVisitDate) : 'No visits'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="relative">
                            <button
                              onClick={() => toggleDropdown(patient.id)}
                              className="text-gray-400 hover:text-gray-500 focus:outline-none"
                            >
                              <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                            
                            {showDropdown === patient.id && (
                              <div 
                                className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                                onBlur={() => setShowDropdown(null)}
                              >
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                  <Link
                                    href={`/patients/${patient.id}`}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    role="menuitem"
                                  >
                                    <ArrowTopRightOnSquareIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                                    View Details
                                  </Link>
                                  <Link
                                    href={`/patients/${patient.id}/edit`}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    role="menuitem"
                                  >
                                    <PencilSquareIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                                    Edit
                                  </Link>
                                  <button
                                    onClick={() => confirmDelete(patient)}
                                    className="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-gray-100"
                                    role="menuitem"
                                  >
                                    <TrashIcon className="mr-3 h-5 w-5 text-red-400" aria-hidden="true" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No patients found. Try adjusting your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {filteredPatients.length > 0 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              Previous
            </button>
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstPatient + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(indexOfLastPatient, filteredPatients.length)}
                </span>{' '}
                of <span className="font-medium">{filteredPatients.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                >
                  <span className="sr-only">Previous</span>
                  <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={`page-${i + 1}`}
                    onClick={() => paginate(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${currentPage === i + 1 ? 'bg-blue-50 text-blue-600 border-blue-500 z-10' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                >
                  <span className="sr-only">Next</span>
                  <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && renderDeleteModal()}
    </div>
  );
} 