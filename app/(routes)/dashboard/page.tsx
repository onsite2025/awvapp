'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserGroupIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ArrowPathIcon,
  PlusIcon,
  CalendarIcon,
  ChartBarIcon,
  UserCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/app/contexts/AuthContext';
import PageNavigation from '../../components/PageNavigation';

// Initial stats structure
const initialStats = [
  { name: 'Total Patients', value: '0', icon: UserGroupIcon, color: 'bg-blue-500' },
  { name: 'Active Templates', value: '0', icon: DocumentTextIcon, color: 'bg-purple-500' },
  { name: 'Completed Visits', value: '0', icon: CheckCircleIcon, color: 'bg-green-500' },
  { name: 'Scheduled Visits', value: '0', icon: CalendarIcon, color: 'bg-amber-500' },
];

// Empty initial states
const emptyPatients: any[] = [];
const emptyVisits: any[] = [];

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(initialStats);
  const [recentPatients, setRecentPatients] = useState(emptyPatients);
  const [recentVisits, setRecentVisits] = useState(emptyVisits);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Function to fetch dynamic data
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
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
      
      // Fetch templates count
      const templatesResponse = await fetch('/api/templates', {
        headers: {
          ...authHeader
        }
      });
      const templates = await templatesResponse.json();
      
      // Fetch patients count
      const patientsResponse = await fetch('/api/patients', {
        headers: {
          ...authHeader
        }
      });
      const patients = await patientsResponse.json();
      
      // Fetch visits
      const visitsResponse = await fetch('/api/visits', {
        headers: {
          ...authHeader
        }
      });
      const visits = await visitsResponse.json();
      
      // Calculate stats
      const activeTemplates = templates.filter((t: any) => t.isActive).length;
      const totalPatients = patients.length;
      const completedVisits = visits.filter((v: any) => v.status?.toLowerCase() === 'completed').length;
      const scheduledVisits = visits.filter((v: any) => v.status?.toLowerCase() === 'scheduled').length;
      
      // Update stats array with real data
      const updatedStats = [
        { name: 'Total Patients', value: totalPatients.toString(), icon: UserGroupIcon, color: 'bg-blue-500' },
        { name: 'Active Templates', value: activeTemplates.toString(), icon: DocumentTextIcon, color: 'bg-purple-500' },
        { name: 'Completed Visits', value: completedVisits.toString(), icon: CheckCircleIcon, color: 'bg-green-500' },
        { name: 'Scheduled Visits', value: scheduledVisits.toString(), icon: CalendarIcon, color: 'bg-amber-500' },
      ];
      
      setStats(updatedStats);
      
      // Set recent patients data
      const recentPatientData = patients.slice(0, 5).map((p: any) => ({
        id: p.id || p._id,
        name: p.name,
        createdAt: new Date(p.createdAt || Date.now()).toLocaleDateString(),
        dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : 'N/A',
        gender: p.gender || 'N/A'
      }));
      
      setRecentPatients(recentPatientData);
      
      // Get real visits data instead of templates
      const recentVisitsData = visits.slice(0, 5).map((v: any) => ({
        id: v.id || v._id,
        patientName: v.patientName,
        date: new Date(v.date || Date.now()).toLocaleDateString(),
        status: v.status || 'scheduled',
        template: v.templateName || 'Unknown template'
      }));
      
      setRecentVisits(recentVisitsData);
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch data on first load and when user changes
  useEffect(() => {
    if (user) {
      fetchDashboardData();
      
      // Fetch user profile to get role
      const fetchUserRole = async () => {
        try {
          const { auth } = await import('../../lib/firebase');
          const currentUser = auth.currentUser;
          
          if (currentUser) {
            const token = await currentUser.getIdToken();
            const response = await fetch('/api/users/profile', {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              cache: 'no-store'
            });
            
            if (response.ok) {
              const profileData = await response.json();
              setUserRole(profileData.role);
            }
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      };
      
      fetchUserRole();
    }
  }, [user]);

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'active':
        return 'bg-purple-100 text-purple-800';
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <PageNavigation
        title="Dashboard"
        breadcrumbs={[{ name: 'Dashboard', href: '/dashboard', current: true }]}
      />
      
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 mt-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-white mb-4 md:mb-0">
            <h1 className="text-2xl font-bold">Welcome to your AWV Dashboard</h1>
            <p className="mt-1 text-blue-100">Manage your patients, templates, and annual wellness visits</p>
          </div>
          <div className="flex space-x-3">
            <Link href="/dashboard-visits" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-white hover:bg-blue-50">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Manage Visits
            </Link>
            <Link href="/dashboard-visits" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-500 hover:bg-indigo-600">
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Visit
            </Link>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Refresh Data
              </>
            )}
          </button>
        </div>
        
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}
        
        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="bg-white overflow-hidden shadow-md rounded-xl border border-gray-100 transition-all hover:shadow-lg"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-full p-3 ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                    </dd>
                  </div>
                </div>
              </div>
              <div className={`h-1 w-full ${stat.color}`}></div>
            </div>
          ))}
        </div>
        
        {/* Last updated */}
        {lastUpdated && (
          <p className="text-sm text-gray-500 mt-2">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Recent patients - Make this span 2 columns */}
          <div className="bg-white shadow-md rounded-xl border border-gray-100 p-6 transition-transform hover:scale-[1.01] lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <UserCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Recent Patients</h2>
              </div>
              <Link
                href="/patients"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 transition"
              >
                View all
              </Link>
            </div>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {loading ? (
                  <div className="py-8 text-center">
                    <ArrowPathIcon className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
                    <p className="mt-2 text-sm text-gray-500">Loading recent patients...</p>
                  </div>
                ) : recentPatients.length > 0 ? (
                  recentPatients.map((patient) => (
                    <li key={patient.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="relative h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="font-medium text-blue-800">
                              {patient.name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {patient.name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            DOB: {patient.dateOfBirth} • {patient.gender}
                          </p>
                        </div>
                        <div>
                          <Link
                            href={`/patients/${patient.id}/edit`}
                            className="inline-flex items-center shadow-sm px-2.5 py-0.5 border border-gray-300 text-sm leading-5 font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <UserGroupIcon className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No patients found.</p>
                    <Link
                      href="/patients/new"
                      className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
                    >
                      <PlusIcon className="h-4 w-4 mr-1.5" />
                      Add your first patient
                    </Link>
                  </div>
                )}
              </ul>
            </div>
          </div>

          {/* Recent visits */}
          <div className="bg-white shadow-md rounded-xl border border-gray-100 p-6 transition-transform hover:scale-[1.01]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <ClipboardDocumentListIcon className="h-5 w-5 text-green-500 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Recent Visits</h2>
              </div>
              <Link
                href="/dashboard-visits"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 transition"
              >
                View all
              </Link>
            </div>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {loading ? (
                  <div className="py-8 text-center">
                    <ArrowPathIcon className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
                    <p className="mt-2 text-sm text-gray-500">Loading recent visits...</p>
                  </div>
                ) : recentVisits.length > 0 ? (
                  recentVisits.map((visit) => (
                    <li key={visit.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {visit.patientName}
                          </p>
                          <div className="flex items-center mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(visit.status)}`}>
                              {visit.status}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">{visit.date}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {visit.template}
                          </p>
                        </div>
                        <div>
                          <Link
                            href={`/visits/${visit.id}`}
                            className="inline-flex items-center shadow-sm px-2.5 py-0.5 border border-gray-300 text-sm leading-5 font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No visits found.</p>
                    <Link
                      href="/create-visit"
                      className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
                    >
                      <PlusIcon className="h-4 w-4 mr-1.5" />
                      Schedule your first visit
                    </Link>
                  </div>
                )}
              </ul>
            </div>
          </div>
        </div>
        
        {/* Quick Actions & Analytics */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="lg:col-span-1 bg-white shadow-md rounded-xl border border-gray-100 p-6 transition-transform hover:scale-[1.01]">
            <div className="flex items-center">
              <ChartBarIcon className="h-5 w-5 text-blue-500 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
            </div>
            <div className="mt-4 space-y-3">
              <Link href="/create-visit" className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                <div className="rounded-full bg-blue-100 p-2 mr-3">
                  <PlusIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800">Create New Visit</p>
                  <p className="text-xs text-blue-600">Schedule a new patient visit</p>
                </div>
              </Link>
              
              <Link href="/patients/new" className="flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
                <div className="rounded-full bg-purple-100 p-2 mr-3">
                  <UserGroupIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-800">Add New Patient</p>
                  <p className="text-xs text-purple-600">Register a new patient record</p>
                </div>
              </Link>
              
              {/* Only show Create Template for ADMIN and PROVIDER roles */}
              {userRole !== 'STAFF' && (
                <Link href="/templates/new" className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition">
                  <div className="rounded-full bg-green-100 p-2 mr-3">
                    <DocumentTextIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Create Template</p>
                    <p className="text-xs text-green-600">Build a new visit template</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
          
          {/* Helpful Links */}
          <div className="lg:col-span-1 bg-white shadow-md rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Getting Started</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition">
                <h3 className="font-medium text-gray-800">Set up your templates</h3>
                <p className="text-sm text-gray-600 mt-1">Create customized visit templates to gather patient information efficiently.</p>
                <Link href="/templates" className="text-sm text-blue-600 inline-flex items-center mt-2">
                  View templates
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition">
                <h3 className="font-medium text-gray-800">Manage your patients</h3>
                <p className="text-sm text-gray-600 mt-1">Add and organize patient information for easier visit scheduling.</p>
                <Link href="/patients" className="text-sm text-blue-600 inline-flex items-center mt-2">
                  View patients
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition">
                <h3 className="font-medium text-gray-800">Conduct AWVs</h3>
                <p className="text-sm text-gray-600 mt-1">Complete annual wellness visits using your templates.</p>
                <Link href="/dashboard-visits" className="text-sm text-blue-600 inline-flex items-center mt-2">
                  View visits
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              
              {/* Only show API Test for ADMIN and PROVIDER roles */}
              {userRole !== 'STAFF' && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition">
                  <h3 className="font-medium text-gray-800">Test the API</h3>
                  <p className="text-sm text-gray-600 mt-1">Try the visit API tools to debug and test functionality.</p>
                  <Link href="/visit-api-test" className="text-sm text-blue-600 inline-flex items-center mt-2">
                    Open API test
                    <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 