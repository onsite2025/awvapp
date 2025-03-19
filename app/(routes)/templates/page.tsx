"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusIcon, 
  PencilSquareIcon, 
  DocumentDuplicateIcon, 
  TrashIcon, 
  ArrowTopRightOnSquareIcon 
} from '@heroicons/react/24/outline';
import { Template } from '../../components/TemplateBuilder/TemplateBuilder';
import PageNavigation from '../../components/PageNavigation';
import { useAuth } from '../../contexts/AuthContext';

export default function TemplatesPage() {
  const { user, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load templates from MongoDB on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        
        // First, fetch the user profile to get the role
        let userRole = null;
        let userProfileResponse;
        
        if (user) {
          try {
            const token = await user.getIdToken();
            userProfileResponse = await fetch('/api/users/profile', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'x-bypass-dev-mode': 'true'
              }
            });
            
            if (userProfileResponse.ok) {
              const profileData = await userProfileResponse.json();
              userRole = profileData.role;
              console.log('User role for templates:', userRole);
            } else {
              console.error('Failed to fetch user profile for role check');
            }
          } catch (profileError) {
            console.error('Error fetching user profile:', profileError);
          }
        }
        
        // Build query params for API call
        let url = '/api/templates';
        if (user) {
          url += `?userId=${user.uid}`;
          
          // If role is ADMIN, get all templates regardless of userId
          if (userRole === 'ADMIN') {
            url = '/api/templates';
            console.log('Admin user - fetching all templates');
          }
        }
        
        // Get Firebase auth token if user is logged in
        let headers: HeadersInit = {};
        
        if (user) {
          const token = await user.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
          
          // Add admin override header if user is admin
          if (userRole === 'ADMIN') {
            headers['x-admin-override'] = 'true';
          }
        }
        
        console.log('Fetching templates with URL:', url);
        const response = await fetch(url, {
          headers
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        
        const data = await response.json();
        console.log(`Loaded ${data.length} templates`);
        setTemplates(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Failed to load templates. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch templates once auth is determined (user is loaded or null)
    if (!loading) {
      fetchTemplates();
    }
  }, [user, loading]);
  
  // Filter templates based on search query and active status
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = showInactive ? true : template.isActive;
    return matchesSearch && matchesStatus;
  });

  // Format date to readable string
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Handle template deletion
  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        // Get Firebase auth token if user is logged in
        let headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        if (user) {
          const token = await user.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`/api/templates/${id}`, {
          method: 'DELETE',
          headers
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete template');
        }
        
        // Update the local state to reflect the deletion
        setTemplates(prev => prev.filter(template => template._id !== id));
      } catch (err) {
        console.error('Error deleting template:', err);
        alert('Failed to delete template. Please try again.');
      }
    }
  };

  if (loading || isLoading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage assessment templates for patient visits
          </p>
        </div>
        
        <PageNavigation />
        
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage assessment templates for patient visits
        </p>
      </div>
      
      <PageNavigation />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage your Annual Wellness Visit templates
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!loading) {
                setIsLoading(true);
                setError(null);
                // Re-trigger the useEffect by updating a state that's in the dependency array
                // Creating a dummy state update is a simple way to do this
                const dummy = {};
                setTemplates([...templates]);
                setTimeout(() => {
                  const fetchTemplatesAgain = async () => {
                    try {
                      // First, fetch the user profile to get the role
                      let userRole = null;
                      let userProfileResponse;
                      
                      if (user) {
                        try {
                          const token = await user.getIdToken();
                          userProfileResponse = await fetch('/api/users/profile', {
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'x-bypass-dev-mode': 'true'
                            }
                          });
                          
                          if (userProfileResponse.ok) {
                            const profileData = await userProfileResponse.json();
                            userRole = profileData.role;
                            console.log('User role for templates (refresh):', userRole);
                          } else {
                            console.error('Failed to fetch user profile for role check');
                          }
                        } catch (profileError) {
                          console.error('Error fetching user profile:', profileError);
                        }
                      }
                      
                      // Build query params for API call
                      let url = '/api/templates';
                      if (user) {
                        url += `?userId=${user.uid}`;
                        
                        // If role is ADMIN, get all templates regardless of userId
                        if (userRole === 'ADMIN') {
                          url = '/api/templates';
                          console.log('Admin user - fetching all templates');
                        }
                      }
                      
                      // Get Firebase auth token if user is logged in
                      let headers: HeadersInit = {};
                      
                      if (user) {
                        const token = await user.getIdToken();
                        headers['Authorization'] = `Bearer ${token}`;
                        
                        // Add admin override header if user is admin
                        if (userRole === 'ADMIN') {
                          headers['x-admin-override'] = 'true';
                        }
                      }
                      
                      console.log('Refreshing templates with URL:', url);
                      const response = await fetch(url, {
                        headers,
                        // Avoid cache
                        cache: 'no-store'
                      });
                      
                      if (!response.ok) {
                        throw new Error('Failed to fetch templates');
                      }
                      
                      const data = await response.json();
                      console.log(`Refreshed ${data.length} templates`);
                      setTemplates(data);
                      setError(null);
                    } catch (err) {
                      console.error('Error refreshing templates:', err);
                      setError('Failed to refresh templates. Please try again later.');
                    } finally {
                      setIsLoading(false);
                    }
                  };
                  
                  fetchTemplatesAgain();
                }, 100);
              }
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Templates
          </button>
          <Link
            href="/templates/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Template
          </Link>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="w-full md:w-64">
            <label htmlFor="search" className="sr-only">Search Templates</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                id="search"
                type="search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center">
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              <span className="ml-2">Show inactive templates</span>
            </label>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Templates List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {filteredTemplates.length} Template{filteredTemplates.length !== 1 ? 's' : ''}
          </h3>
        </div>
        
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 px-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new template.</p>
            <div className="mt-6">
              <Link
                href="/templates/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Template
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTemplates.map((template) => (
                  <tr key={template._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-md bg-blue-100 flex items-center justify-center text-blue-600">
                            <DocumentDuplicateIcon className="h-6 w-6" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{template.name}</div>
                          <div className="text-sm text-gray-500">Created by: {template.userId || 'Unknown'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{template.sectionCount} Sections</div>
                      <div className="text-sm text-gray-500">
                        {template.questionCount} Questions
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        template.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{formatDate(template.updatedAt)}</div>
                      <div className="text-xs text-gray-400">Created: {formatDate(template.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/templates/${template._id}`}
                          className="text-gray-500 hover:text-gray-700"
                          title="View"
                        >
                          <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                        </Link>
                        <Link
                          href={`/templates/${template._id}/edit`}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </Link>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700"
                          title="Delete"
                          onClick={() => handleDeleteTemplate(template._id || '')}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 