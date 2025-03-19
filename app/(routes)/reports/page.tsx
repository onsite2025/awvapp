'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  DocumentArrowDownIcon, 
  FunnelIcon, 
  ChartBarIcon, 
  ChartPieIcon,
  TableCellsIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import PageNavigation from '../../components/PageNavigation';
import { useAuth } from '../../contexts/AuthContext';

// Interface for our filter state
interface ReportFilters {
  dateRange: 'all' | 'last30' | 'last90' | 'thisYear' | 'custom';
  startDate: string | null;
  endDate: string | null;
  provider: string;
  template: string;
  showFollowups: boolean;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('charts');
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: 'all',
    startDate: null,
    endDate: null,
    provider: '',
    template: '',
    showFollowups: false,
  });
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [showFilters, setShowFilters] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get auth token
        let authHeader = {};
        const { auth } = await import('../../lib/firebase');
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          const token = await currentUser.getIdToken();
          authHeader = {
            'Authorization': `Bearer ${token}`
          };
        }

        // Fetch visits
        const visitsResponse = await fetch('/api/visits', {
          headers: {
            ...authHeader
          }
        });
        
        if (!visitsResponse.ok) {
          throw new Error(`Error fetching visits: ${visitsResponse.statusText}`);
        }
        
        const visitsData = await visitsResponse.json();
        setVisits(visitsData);
        
        // Fetch patients
        const patientsResponse = await fetch('/api/patients', {
          headers: {
            ...authHeader
          }
        });
        
        if (patientsResponse.ok) {
          const patientsData = await patientsResponse.json();
          setPatients(patientsData);
        }
        
        // Fetch templates
        const templatesResponse = await fetch('/api/templates', {
          headers: {
            ...authHeader
          }
        });
        
        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json();
          setTemplates(templatesData);
        }
        
        // Extract unique providers from visits
        if (visitsData.length > 0) {
          const uniqueProviders = Array.from(new Set(visitsData.map((v: any) => v.provider)))
            .filter(Boolean)
            .map((name: string) => ({ id: name, name }));
          setProviders(uniqueProviders);
        }
      } catch (error) {
        console.error('Error loading report data:', error);
        setError('Failed to load report data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  // Apply filters to visits
  const filteredVisits = visits.filter(visit => {
    // Filter by provider
    if (filters.provider && visit.provider !== filters.provider) {
      return false;
    }
    
    // Filter by template
    if (filters.template && visit.templateId !== filters.template) {
      return false;
    }
    
    // Filter by follow-up status
    if (filters.showFollowups && !visit.followupRecommended) {
      return false;
    }
    
    // Filter by date range
    if (filters.dateRange !== 'all') {
      const visitDate = new Date(visit.date);
      const today = new Date();
      
      if (filters.dateRange === 'last30') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        if (visitDate < thirtyDaysAgo) {
          return false;
        }
      } else if (filters.dateRange === 'last90') {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(today.getDate() - 90);
        if (visitDate < ninetyDaysAgo) {
          return false;
        }
      } else if (filters.dateRange === 'thisYear') {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        if (visitDate < startOfYear) {
          return false;
        }
      } else if (filters.dateRange === 'custom') {
        if (filters.startDate && new Date(visit.date) < new Date(filters.startDate)) {
          return false;
        }
        if (filters.endDate && new Date(visit.date) > new Date(filters.endDate)) {
          return false;
        }
      }
    }
    
    return true;
  });

  // Calculate summary metrics
  const totalVisits = filteredVisits.length;
  const uniquePatients = new Set(filteredVisits.map(visit => visit.patientId)).size;
  const averageScore = totalVisits > 0 ? Math.round(filteredVisits.reduce((sum, visit) => sum + visit.assessmentScore, 0) / totalVisits) : 0;
  const followupRate = totalVisits > 0 ? Math.round((filteredVisits.filter(visit => visit.followupRecommended).length / totalVisits) * 100) : 0;
  const avgRecommendations = totalVisits > 0 ? (filteredVisits.reduce((sum, visit) => sum + visit.recommendationCount, 0) / totalVisits).toFixed(1) : '0';
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle filter changes
  const handleFilterChange = (name: keyof ReportFilters, value: any) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      dateRange: 'all',
      startDate: null,
      endDate: null,
      provider: '',
      template: '',
      showFollowups: false,
    });
  };

  // Handle export
  const handleExport = () => {
    alert(`Exporting ${filteredVisits.length} visit reports as ${exportFormat.toUpperCase()}`);
    // In a real app, this would trigger a download
  };

  // Render the summary tab
  const renderSummaryTab = () => (
    <div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Total Visits Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <DocumentTextIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Visits</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{totalVisits}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Unique Patients Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <ChartPieIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Unique Patients</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{uniquePatients}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Average Score Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                <ChartBarIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Average Assessment Score</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{averageScore}/100</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Follow-up Rate Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <CalendarIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Follow-up Rate</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{followupRate}%</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Chart - In real app, would use a chart library like Chart.js or Recharts */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Visit Trends</h3>
        </div>
        <div className="p-6 text-center">
          <div className="py-12 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No chart data to display</h3>
              <p className="mt-1 text-sm text-gray-500">
                In a production app, this would display a chart showing visit trends over time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Summary */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recommendation Analytics</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h4 className="text-base font-medium text-gray-900 mb-2">Average Recommendations Per Visit</h4>
              <div className="flex items-center">
                <span className="text-3xl font-bold text-blue-600">{avgRecommendations}</span>
                <span className="ml-2 text-sm text-gray-500">recommendations per visit</span>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="text-base font-medium text-gray-900 mb-2">Follow-up Required</h4>
              <div className="flex items-center">
                <span className="text-3xl font-bold text-red-600">{followupRate}%</span>
                <span className="ml-2 text-sm text-gray-500">of visits require follow-up</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render the visits tab
  const renderVisitsTab = () => (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Visit Reports</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Detailed information for each completed visit.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Provider
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Template
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Follow-up
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredVisits.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No visits match your filters.
                </td>
              </tr>
            ) : (
              filteredVisits.map((visit) => (
                <tr key={visit.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{visit.patientName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(visit.date)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{visit.provider}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{visit.templateName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{visit.assessmentScore}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${visit.followupRecommended ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {visit.followupRecommended ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a 
                      href={`/visits/${visit.id}/summary`} 
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      View
                    </a>
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-900"
                      onClick={() => alert(`Downloading report for ${visit.patientName}`)}
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render the templates tab
  const renderTemplatesTab = () => (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Template Analytics</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Performance metrics for each assessment template.
        </p>
      </div>
      
      {templates.length === 0 ? (
        <div className="px-6 py-4 text-center">
          <p className="text-sm text-gray-500">No templates available.</p>
        </div>
      ) : (
        <div className="px-6 py-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template: any) => {
            // Calculate template usage stats from filtered visits
            const templateVisits = filteredVisits.filter(visit => visit.templateId === template.id);
            const usageCount = templateVisits.length;
            const avgScore = usageCount > 0 
              ? Math.round(templateVisits.reduce((sum, visit) => sum + visit.assessmentScore, 0) / usageCount) 
              : 0;
            
            return (
              <div key={template.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-2">{template.name}</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Times Used:</span>
                    <span className="text-sm font-medium text-gray-900">{usageCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Avg. Score:</span>
                    <span className="text-sm font-medium text-gray-900">{avgScore}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Questions:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {template.sections?.reduce((count: number, section: any) => 
                        count + (section.questions?.length || 0), 0) || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Last Used:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {templateVisits.length > 0 
                        ? formatDate(templateVisits.sort((a, b) => 
                            new Date(b.date).getTime() - new Date(a.date).getTime()
                          )[0].date) 
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
    <div className="min-h-screen bg-gray-50">
      <PageNavigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="mt-1 text-sm text-gray-500">
                Generate reports and view analytics for your Annual Wellness Visits
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FunnelIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              <button
                type="button"
                onClick={() => handleExport()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" />
                Export Reports
              </button>
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="bg-white p-4 shadow rounded-lg mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Reset All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Date Range */}
                <div>
                  <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">
                    Date Range
                  </label>
                  <select
                    id="dateRange"
                    name="dateRange"
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="all">All Time</option>
                    <option value="last30">Last 30 Days</option>
                    <option value="last90">Last 90 Days</option>
                    <option value="thisYear">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {/* Custom date range */}
                {filters.dateRange === 'custom' && (
                  <>
                    <div>
                      <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                        Start Date
                      </label>
                      <input
                        type="date"
                        id="startDate"
                        name="startDate"
                        value={filters.startDate || ''}
                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                        End Date
                      </label>
                      <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={filters.endDate || ''}
                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </>
                )}

                {/* Provider */}
                <div>
                  <label htmlFor="provider" className="block text-sm font-medium text-gray-700">
                    Provider
                  </label>
                  <select
                    id="provider"
                    name="provider"
                    value={filters.provider}
                    onChange={(e) => handleFilterChange('provider', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">All Providers</option>
                    {providers.map(provider => (
                      <option key={provider.id} value={provider.name}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template */}
                <div>
                  <label htmlFor="template" className="block text-sm font-medium text-gray-700">
                    Template
                  </label>
                  <select
                    id="template"
                    name="template"
                    value={filters.template}
                    onChange={(e) => handleFilterChange('template', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">All Templates</option>
                    {templates.map((template: any) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Follow-ups */}
                <div className="flex items-center h-full pt-6">
                  <input
                    id="showFollowups"
                    name="showFollowups"
                    type="checkbox"
                    checked={filters.showFollowups}
                    onChange={(e) => handleFilterChange('showFollowups', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showFollowups" className="ml-2 block text-sm text-gray-700">
                    Show only visits requiring follow-up
                  </label>
                </div>

                {/* Export Format */}
                <div className="flex items-center h-full pt-6">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Export Format:</span>
                    <div className="flex items-center">
                      <input
                        id="pdf"
                        name="exportFormat"
                        type="radio"
                        value="pdf"
                        checked={exportFormat === 'pdf'}
                        onChange={() => setExportFormat('pdf')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="pdf" className="ml-2 block text-sm text-gray-700">
                        PDF
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="csv"
                        name="exportFormat"
                        type="radio"
                        value="csv"
                        checked={exportFormat === 'csv'}
                        onChange={() => setExportFormat('csv')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="csv" className="ml-2 block text-sm text-gray-700">
                        CSV
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results count and refresh */}
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">
              Showing {filteredVisits.length} {filteredVisits.length === 1 ? 'result' : 'results'}
            </p>
            <button
              type="button"
              onClick={async () => {
                setIsLoading(true);
                try {
                  // Get auth token
                  let authHeader = {};
                  const { auth } = await import('../../lib/firebase');
                  const currentUser = auth.currentUser;
                  
                  if (currentUser) {
                    const token = await currentUser.getIdToken();
                    authHeader = {
                      'Authorization': `Bearer ${token}`
                    };
                  }
                  
                  // Fetch visits from API
                  const visitsResponse = await fetch('/api/visits', {
                    headers: {
                      ...authHeader
                    }
                  });
                  
                  if (!visitsResponse.ok) {
                    throw new Error(`Error refreshing visits: ${visitsResponse.statusText}`);
                  }
                  
                  const visitsData = await visitsResponse.json();
                  setVisits(visitsData);
                } catch (error) {
                  console.error('Error refreshing data:', error);
                  setError('Failed to refresh data. Please try again.');
                } finally {
                  setIsLoading(false);
                }
              }}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowPathIcon className="mr-1 h-4 w-4" />
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('summary')}
                className={`${
                  activeTab === 'summary'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } py-4 px-1 border-b-2 font-medium text-sm focus:outline-none`}
              >
                Summary
              </button>
              <button
                onClick={() => setActiveTab('visits')}
                className={`${
                  activeTab === 'visits'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } py-4 px-1 border-b-2 font-medium text-sm focus:outline-none`}
              >
                Visit Reports
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`${
                  activeTab === 'templates'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } py-4 px-1 border-b-2 font-medium text-sm focus:outline-none`}
              >
                Template Analytics
              </button>
            </nav>
          </div>

          {/* Tab content */}
          <div>
            {activeTab === 'summary' && renderSummaryTab()}
            {activeTab === 'visits' && renderVisitsTab()}
            {activeTab === 'templates' && renderTemplatesTab()}
          </div>
        </div>
      </div>
    </div>
  );
} 