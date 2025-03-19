'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageNavigation from '@/app/components/PageNavigation';
import { 
  PlusIcon, 
  ArrowPathIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

// Define typings for visits and related data
interface Visit {
  id?: string;
  _id?: string;
  patientId: string;
  patientName: string;
  templateId: string;
  templateName?: string;
  date: Date | string;
  status: string;
  provider?: string;
  userId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface NewVisitForm {
  patientId: string;
  patientName: string;
  templateId: string;
  templateName: string;
  date: string;
  status: string;
  provider: string;
  notes?: string;
}

interface Patient {
  id: string;
  _id?: string;
  name: string;
}

interface Template {
  id: string;
  _id?: string;
  name: string;
}

export default function VisitsPage() {
  const router = useRouter();
  
  // Check for 'new=true' in URL
  const [shouldShowNewForm, setShouldShowNewForm] = useState(false);
  
  useEffect(() => {
    // This runs client-side after mount
    const url = new URL(window.location.href);
    const showNewParam = url.searchParams.get('new');
    if (showNewParam === 'true') {
      setShouldShowNewForm(true);
      // Remove the parameter from URL to avoid showing the form on refresh
      const newUrl = '/dashboard-visits';
      router.replace(newUrl);
    }
  }, [router]);
  
  // Authentication
  const { user } = useAuth();
  const [authHeader, setAuthHeader] = useState<Record<string, string>>({});
  
  // State for all data
  const [visits, setVisits] = useState<Visit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewVisitForm, setShowNewVisitForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  // Form state
  const [newVisit, setNewVisit] = useState<NewVisitForm>({
    patientId: '',
    patientName: '',
    templateId: '',
    templateName: '',
    date: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDThh:mm
    status: 'scheduled',
    provider: '',
    notes: ''
  });

  // Show new form when shouldShowNewForm changes
  useEffect(() => {
    if (shouldShowNewForm) {
      setShowNewVisitForm(true);
    }
  }, [shouldShowNewForm]);

  // Set up authentication header when user is available
  useEffect(() => {
    const setupAuth = async () => {
      console.log("Setting up authentication...");
      
      if (!user) {
        console.log("No user available, cannot set up auth header");
        return;
      }
      
      console.log("User available:", {
        uid: user.uid,
        email: user.email,
        isAnonymous: user.isAnonymous
      });
      
      try {
        const { auth } = await import('@/app/lib/firebase');
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          console.log("Firebase currentUser matches:", currentUser.uid === user.uid);
          const token = await currentUser.getIdToken();
          console.log("Token obtained, first 10 chars:", token.substring(0, 10) + "...");
          
          setAuthHeader({
            'Authorization': `Bearer ${token}`
          });
          
          // Don't call loadVisits() here - it will be called by the useEffect below
          console.log("Auth header set, will load visits when state updates");
        } else {
          console.error("Firebase currentUser is null despite having user context");
        }
      } catch (error) {
        console.error('Error setting up auth:', error);
        setError('Authentication error. Please reload the page.');
      }
    };
    
    setupAuth();
  }, [user]);

  // Add a separate useEffect to listen for authHeader changes
  useEffect(() => {
    if (Object.keys(authHeader).length > 0) {
      console.log("Auth header state updated, now loading visits");
      loadVisits();
    }
  }, [authHeader]);

  // Fix the status values that might be in an unexpected format
  const normalizeVisitStatus = (visit: Visit): Visit => {
    const statusMap: Record<string, string> = {
      'scheduled': 'scheduled',
      'in-progress': 'in-progress',
      'in progress': 'in-progress',
      'inprogress': 'in-progress',
      'in_progress': 'in-progress',
      'complete': 'completed',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'canceled': 'cancelled'
    };
    
    const normalizedVisit = { ...visit };
    
    if (visit.status) {
      const lowerStatus = visit.status.toLowerCase();
      normalizedVisit.status = statusMap[lowerStatus] || lowerStatus;
    }
    
    return normalizedVisit;
  };
  
  // Modify the loadVisits function to normalize status values
  const loadVisits = async () => {
    if (Object.keys(authHeader).length === 0) {
      console.error("Error: loadVisits called but authHeader is empty");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading visits with auth header:', {
        headerExists: !!authHeader,
        headerLength: Object.keys(authHeader).length,
        userId: user?.uid
      });
      
      const response = await fetch('/api/visits', {
        headers: {
          ...authHeader
        }
      });
      
      console.log('Visits API response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Visits loaded:', data, 'Total visits:', data.length);
      
      // Convert dates to Date objects and normalize status values
      const processedVisits = data.map((visit: Visit) => normalizeVisitStatus({
        ...visit,
        date: new Date(visit.date)
      }));
      
      setVisits(processedVisits);
      applyFilters(processedVisits, statusFilter, searchTerm);
    } catch (error: any) {
      console.error('Error loading visits:', error);
      setError(`Failed to load visits: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load reference data only when showing the new visit form
  useEffect(() => {
    if (showNewVisitForm && Object.keys(authHeader).length > 0) {
      loadReferenceData();
    }
  }, [showNewVisitForm, authHeader]);

  // Load patients and templates for reference data
  const loadReferenceData = async () => {
    if (Object.keys(authHeader).length === 0) return;
    
    try {
      // Load patients
      const patientsResponse = await fetch('/api/patients', {
        headers: {
          ...authHeader
        }
      });
      
      if (patientsResponse.ok) {
        const patientsData = await patientsResponse.json();
        setPatients(patientsData);
      }
      
      // Load templates
      const templatesResponse = await fetch('/api/templates', {
        headers: {
          ...authHeader
        }
      });
      
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData);
      }
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  };

  // Apply filters whenever filter criteria or visits change
  useEffect(() => {
    applyFilters(visits, activeTab !== 'all' ? activeTab : statusFilter, searchTerm);
  }, [statusFilter, searchTerm, activeTab, visits]);

  // Filter the visits based on status and search term
  const applyFilters = (allVisits: Visit[], status: string, search: string) => {
    let filtered = [...allVisits];
    
    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(visit => {
        const normalizedVisit = normalizeVisitStatus(visit);
        return normalizedVisit.status === status;
      });
    }
    
    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(visit => 
        visit.patientName?.toLowerCase().includes(searchLower) ||
        visit.templateName?.toLowerCase().includes(searchLower) ||
        visit.provider?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
    setFilteredVisits(filtered);
  };

  // Calculate counts for each status
  const scheduledVisits = visits.filter(v => normalizeVisitStatus(v).status === 'scheduled');
  const inProgressVisits = visits.filter(v => normalizeVisitStatus(v).status === 'in-progress');
  const completedVisits = visits.filter(v => normalizeVisitStatus(v).status === 'completed');
  
  // Debug visits status values
  useEffect(() => {
    if (visits.length > 0) {
      console.log('VISITS STATUS DEBUG:');
      console.log('Total visits:', visits.length);
      
      // Log sample of status values
      const statusValues = visits.map(v => v.status);
      const uniqueStatusValues = [...new Set(statusValues)];
      console.log('Unique status values:', uniqueStatusValues);
      
      // Count by status
      console.log('Visits by status:');
      console.log('- Scheduled:', scheduledVisits.length);
      console.log('- In Progress:', inProgressVisits.length);
      console.log('- Completed:', completedVisits.length);
      
      // Log a few sample visits with their status
      console.log('Sample visits:');
      visits.slice(0, 3).forEach((visit, i) => {
        console.log(`Visit ${i + 1}:`, {
          id: visit.id || visit._id,
          patientName: visit.patientName,
          status: visit.status,
          statusType: typeof visit.status
        });
      });
    }
  }, [visits]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Special handling for patient and template selects
    if (name === 'patientId' && value) {
      const patient = patients.find(p => p.id === value || p._id === value);
      setNewVisit({
        ...newVisit,
        patientId: value,
        patientName: patient?.name || '',
      });
    } else if (name === 'templateId' && value) {
      const template = templates.find(t => t.id === value || t._id === value);
      setNewVisit({
        ...newVisit,
        templateId: value,
        templateName: template?.name || '',
      });
    } else {
      setNewVisit({
        ...newVisit,
        [name]: value
      });
    }
  };

  // Create a new visit
  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted - handleCreateVisit called");
    
    if (!user) {
      console.error("Error: No user logged in");
      setError('You must be logged in to create a visit.');
      return;
    }
    
    // Debug user information
    console.log('User creating visit:', {
      uid: user.uid,
      uidType: typeof user.uid,
      email: user.email
    });
    
    if (Object.keys(authHeader).length === 0) {
      console.error("Error: No auth header available");
      setError('Not authenticated. Please reload the page.');
      return;
    }
    
    // Validate form data - check all required fields
    if (!newVisit.patientId || !newVisit.templateId || !newVisit.date || !newVisit.provider) {
      console.error("Error: Missing required fields", {
        patientId: !!newVisit.patientId,
        templateId: !!newVisit.templateId,
        date: !!newVisit.date,
        provider: !!newVisit.provider
      });
      setError('Please fill out all required fields');
      return;
    }
    
    console.log("Form validation passed, attempting to create visit");
    setLoading(true);
    setError(null);
    
    try {
      // Make sure we have the templateName
      if (!newVisit.templateName && newVisit.templateId) {
        const template = templates.find(t => t.id === newVisit.templateId || t._id === newVisit.templateId);
        if (template) {
          newVisit.templateName = template.name;
        }
      }
      
      // Parse the date string from the form
      let visitDate;
      try {
        visitDate = new Date(newVisit.date);
        if (isNaN(visitDate.getTime())) {
          throw new Error('Invalid date format');
        }
        console.log("Date parsed successfully:", visitDate.toISOString());
      } catch (error) {
        console.error("Error parsing date:", newVisit.date, error);
        setError('Please enter a valid date and time');
        setLoading(false);
        return;
      }
      
      // Create visit data object with all required fields
      const visitData = {
        patientId: newVisit.patientId,
        patientName: newVisit.patientName,
        templateId: newVisit.templateId,
        templateName: newVisit.templateName || 'Unknown Template',
        date: visitDate.toISOString(),
        status: newVisit.status.toLowerCase(),
        provider: newVisit.provider,
        notes: newVisit.notes,
        userId: user.uid
      };
      
      console.log('Creating visit with data:', JSON.stringify(visitData, null, 2));
      
      console.log('Sending request to /api/visits');
      const response = await fetch('/api/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify(visitData)
      });
      
      console.log('Response received. Status:', response.status);
      
      if (!response.ok) {
        let errorText = await response.text();
        console.error('Error response:', errorText);
        try {
          // Try to parse as JSON
          const errorJson = JSON.parse(errorText);
          errorText = errorJson.error || errorText;
        } catch (e) {
          // Keep as text if not JSON
        }
        throw new Error(`Failed to create visit: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Visit created successfully:', result);
      
      // Reset form and refresh visits
      setNewVisit({
        patientId: '',
        patientName: '',
        templateId: '',
        templateName: '',
        date: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDThh:mm
        status: 'scheduled',
        provider: '',
        notes: ''
      });
      
      setShowNewVisitForm(false);
      
      // Reload visits
      await loadVisits();
    } catch (error: any) {
      console.error('Error creating visit:', error);
      setError(`Failed to create visit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update a visit's status
  const updateVisitStatus = async (visitId: string, newStatus: string) => {
    if (Object.keys(authHeader).length === 0) {
      setError('Not authenticated. Please reload the page.');
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
        throw new Error(`Error fetching visit: ${getResponse.status}`);
      }
      
      const currentVisit = await getResponse.json();
      
      // Update the visit status
      const updatedVisit = {
        ...currentVisit,
        status: newStatus.toLowerCase()
      };
      
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
        throw new Error(`Update failed: ${errorText}`);
      }
      
      console.log('Visit updated successfully');
      
      // Refresh the visits list
      await loadVisits();
    } catch (error: any) {
      console.error('Error updating visit:', error);
      setError(`Failed to update visit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete a visit
  const deleteVisit = async (visitId: string) => {
    if (!confirm('Are you sure you want to delete this visit?')) {
      return;
    }
    
    if (Object.keys(authHeader).length === 0) {
      setError('Not authenticated. Please reload the page.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/visits/${visitId}`, {
        method: 'DELETE',
        headers: {
          ...authHeader
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${errorText}`);
      }
      
      console.log('Visit deleted successfully');
      
      // Refresh the visits list
      await loadVisits();
    } catch (error: any) {
      console.error('Error deleting visit:', error);
      setError(`Failed to delete visit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Format a date for display
  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStartVisit = async (visitId: string) => {
    if (!visitId) {
      console.error("Error: No visit ID provided");
      setError("Cannot start visit: Missing visit ID");
      return;
    }
    
    console.log(`Starting visit ${visitId}...`);
    setLoading(true);
    
    try {
      // First update the visit status to in-progress
      await updateVisitStatus(visitId, 'in-progress');
      console.log(`Visit ${visitId} status updated to in-progress`);
      
      // Then navigate to the conduct page
      console.log(`Navigating to conduct page for visit ${visitId}`);
      
      // Add a small delay to ensure the status update is saved before navigating
      setTimeout(() => {
        router.push(`/visits/${visitId}/conduct`);
      }, 500);
    } catch (error) {
      console.error("Error starting visit:", error);
      setError(`Failed to start visit: ${error}`);
      setLoading(false);
    }
  };

  // Function to handle continuing an in-progress visit
  const handleContinueVisit = async (visitId: string) => {
    if (!visitId) {
      console.error("Error: No visit ID provided");
      setError("Cannot continue visit: Missing visit ID");
      return;
    }
    
    console.log(`Continuing visit ${visitId}...`);
    setLoading(true);
    
    try {
      // Navigate to the conduct page without changing status
      console.log(`Navigating to conduct page for visit ${visitId}`);
      router.push(`/visits/${visitId}/conduct`);
    } catch (error) {
      console.error("Error continuing visit:", error);
      setError(`Failed to continue visit: ${error}`);
      setLoading(false);
    }
  };

  const handleCompleteVisit = async (visitId: string) => {
    if (!visitId) {
      console.error("Error: No visit ID provided");
      setError("Cannot complete visit: Missing visit ID");
      return;
    }
    
    if (!confirm('Are you sure you want to mark this visit as completed?')) {
      return;
    }
    
    console.log(`Completing visit ${visitId}...`);
    setLoading(true);
    
    try {
      await updateVisitStatus(visitId, 'completed');
      console.log(`Visit ${visitId} marked as completed`);
      setError(null);
      
      // Reload the visits to update the UI
      await loadVisits();
    } catch (error) {
      console.error("Error completing visit:", error);
      setError(`Failed to complete visit: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Add test function to check API connectivity
  const testApiConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing API connection - fetching visits');
      const response = await fetch('/api/visits', {
        headers: {
          ...authHeader
        }
      });
      
      console.log('API Test response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API test failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API test successful, received data:', data);
      
      setError('API connection test successful! Received data from server.');
    } catch (error: any) {
      console.error('API test error:', error);
      setError(`API connection test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Debug database function
  const debugDatabase = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Checking database contents directly');
      const response = await fetch('/api/debug');
      
      if (!response.ok) {
        throw new Error(`Debug request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Debug info received:', data);
      
      setError(`Database contains ${data.totalVisits} total visits for ${data.uniqueUserIds} users. Sample IDs: ${data.sampleUserIds.join(', ')}`);
    } catch (error: any) {
      console.error('Debug request error:', error);
      setError(`Debug request failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fix status values in the database
  const fixStatusValues = async () => {
    if (Object.keys(authHeader).length === 0) {
      setError('Not authenticated. Please reload the page.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fixing status values in database');
      const response = await fetch('/api/debug/fix-status', {
        headers: {
          ...authHeader
        }
      });
      
      if (!response.ok) {
        throw new Error(`Fix status request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Fix status response:', data);
      
      if (data.success) {
        setError(`Successfully fixed ${data.message}. Reloading visits...`);
        
        // Reload visits after fixing
        loadVisits();
      } else {
        setError(`Fix status operation failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Fix status error:', error);
      setError(`Fix status request failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditVisit = async (visitId: string) => {
    if (!visitId) {
      console.error("Error: No visit ID provided");
      setError("Cannot edit visit: Missing visit ID");
      return;
    }
    
    console.log(`Editing visit ${visitId}...`);
    setLoading(true);
    
    try {
      // Instead of showing the edit form, navigate directly to the conduct page
      // similar to how handleContinueVisit works
      console.log(`Navigating to conduct page for editing visit ${visitId}`);
      router.push(`/visits/${visitId}/conduct?allowEdit=true`);
    } catch (error: any) {
      console.error("Error editing visit:", error);
      setError(`Failed to edit visit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPlan = async (visitId: string) => {
    if (!visitId) {
      console.error("Error: No visit ID provided");
      setError("Cannot view plan: Missing visit ID");
      return;
    }
    
    console.log(`Viewing plan for visit ${visitId}...`);
    setLoading(true);
    
    try {
      // Navigate to the conduct page with a showPlan parameter
      // This will display the plan directly instead of going to a separate page
      console.log(`Navigating to conduct page with showPlan=true for visit ${visitId}`);
      router.push(`/visits/${visitId}/conduct?showPlan=true`);
    } catch (error) {
      console.error(`Error navigating to plan view: ${error}`);
      setError(`Failed to view plan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsPdf = async (visitId: string) => {
    if (!visitId) {
      console.error("Error: No visit ID provided");
      setError("Cannot save as PDF: Missing visit ID");
      return;
    }
    
    console.log(`Saving visit ${visitId} as PDF...`);
    setLoading(true);
    setError(null);
    
    try {
      // Fetch the current visit data with expanded template data and full question details
      const getResponse = await fetch(`/api/visits/${visitId}?includeTemplate=true&includeQuestionDetails=true`, {
        headers: {
          ...authHeader
        }
      });
      
      if (!getResponse.ok) {
        throw new Error(`Error fetching visit: ${getResponse.status}`);
      }
      
      const currentVisit = await getResponse.json();
      console.log("Visit data fetched:", currentVisit);
      
      // If the template isn't included in the visit data, fetch it separately with full question details
      let visitWithTemplate = {...currentVisit};
      
      if (currentVisit.templateId && !currentVisit.template) {
        try {
          console.log(`Fetching template data for template ID: ${currentVisit.templateId}`);
          const templateResponse = await fetch(`/api/templates/${currentVisit.templateId}?includeQuestionDetails=true`, {
            headers: {
              ...authHeader
            }
          });
          
          if (templateResponse.ok) {
            const templateData = await templateResponse.json();
            visitWithTemplate.template = templateData;
            console.log("Template data fetched:", templateData);
          } else {
            console.warn(`Unable to fetch template: ${templateResponse.status}`);
          }
        } catch (templateError) {
          console.error("Error fetching template data:", templateError);
        }
      }
      
      // Ensure the template includes the full questions array with options
      if (visitWithTemplate.template && !visitWithTemplate.template.questions) {
        try {
          console.log("Template missing questions array, fetching complete template data");
          const completeTemplateResponse = await fetch(`/api/templates/${currentVisit.templateId}?includeQuestions=true`, {
            headers: {
              ...authHeader
            }
          });
          
          if (completeTemplateResponse.ok) {
            const completeTemplateData = await completeTemplateResponse.json();
            visitWithTemplate.template = completeTemplateData;
            console.log("Complete template data fetched:", completeTemplateData);
          }
        } catch (completeTemplateError) {
          console.error("Error fetching complete template data:", completeTemplateError);
        }
      }
      
      // Generate PDF with visit data only, without health plan
      console.log("Generating PDF with visit data only (no health plan)...");
      const pdfResponse = await fetch('/api/visits/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          visitId: visitId,
          visitData: visitWithTemplate, // Include the complete visit data with template
          excludeHealthPlan: true // Flag to exclude health plan from PDF
        })
      });
      
      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        console.error("PDF generation failed:", errorText);
        throw new Error(`Error generating PDF: ${pdfResponse.status}. ${errorText}`);
      }
      
      const pdfBlob = await pdfResponse.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Create a download link
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `Visit_Assessment_${visitId}.pdf`;
      a.click();
      
      // Clean up
      URL.revokeObjectURL(pdfUrl);
      
      console.log('Visit saved as PDF successfully');
      setLoading(false);
    } catch (error: any) {
      console.error("Error saving as PDF:", error);
      setError(`Failed to save as PDF: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageNavigation 
        title="Visit Management"
        breadcrumbs={[{ name: 'Visits', href: '/dashboard-visits', current: true }]}
      />
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-gray-500">
            Manage and conduct patient visits
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => loadVisits()}
            className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            disabled={loading}
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Refresh
          </button>
          
          <button
            onClick={() => setShowNewVisitForm(!showNewVisitForm)}
            className="flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            New Visit
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-6">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {loading && (
        <div className="animate-pulse text-center p-4 mb-6 bg-blue-50 rounded">
          Loading...
        </div>
      )}
      
      {showNewVisitForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6 border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold">Create New Visit</h2>
          </div>
          
          <form onSubmit={handleCreateVisit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Patient *</label>
                <select
                  name="patientId"
                  value={newVisit.patientId}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Patient</option>
                  {patients.map(patient => (
                    <option key={patient.id || patient._id} value={patient.id || patient._id}>
                      {patient.name}
                    </option>
                  ))}
                </select>
                {patients.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    No patients available. <Link href="/patients" className="text-blue-500 hover:underline">Create a patient</Link> first.
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Template *</label>
                <select
                  name="templateId"
                  value={newVisit.templateId}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Template</option>
                  {templates.map(template => (
                    <option key={template.id || template._id} value={template.id || template._id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {templates.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    No templates available. <Link href="/templates" className="text-blue-500 hover:underline">Create a template</Link> first.
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Date & Time *</label>
                <input
                  type="datetime-local"
                  name="date"
                  value={newVisit.date}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  name="status"
                  value={newVisit.status}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Provider *</label>
                <input
                  type="text"
                  name="provider"
                  value={newVisit.provider}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="Provider name"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={newVisit.notes}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  rows={3}
                  placeholder="Optional notes about this visit"
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={fixStatusValues}
                className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-yellow-100 hover:bg-yellow-200"
              >
                Fix Status Values
              </button>
              <button
                type="button"
                onClick={debugDatabase}
                className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-red-100 hover:bg-red-200"
              >
                Debug Database
              </button>
              <button
                type="button"
                onClick={testApiConnection}
                className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
              >
                Test API Connection
              </button>
              <button
                type="button"
                onClick={() => setShowNewVisitForm(false)}
                className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Visit'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Status tabs */}
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('all')}
              className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Visits ({visits.length})
            </button>
            
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'scheduled'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Scheduled ({scheduledVisits.length})
            </button>
            
            <button
              onClick={() => setActiveTab('in-progress')}
              className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'in-progress'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              In Progress ({inProgressVisits.length})
            </button>
            
            <button
              onClick={() => setActiveTab('completed')}
              className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'completed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Completed ({completedVisits.length})
            </button>
          </nav>
        </div>
        
        {/* Filter and search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative rounded-md w-full md:w-64">
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-md pl-10"
                placeholder="Search visits..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Visits table */}
        {filteredVisits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVisits.map((visit) => (
                  <tr key={visit.id || visit._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          visit.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          visit.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                          visit.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{visit.patientName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">{visit.templateName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(visit.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {visit.provider || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {visit.status === 'scheduled' && (
                          <button
                            onClick={() => handleStartVisit(visit.id || visit._id || '')}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                          >
                            Start
                          </button>
                        )}
                        {visit.status === 'in-progress' && (
                          <>
                            <button
                              onClick={() => handleContinueVisit(visit.id || visit._id || '')}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                            >
                              Continue
                            </button>
                            <button
                              onClick={() => handleCompleteVisit(visit.id || visit._id || '')}
                              className="text-yellow-600 hover:text-yellow-900 bg-yellow-50 hover:bg-yellow-100 px-2 py-1 rounded"
                            >
                              Complete
                            </button>
                          </>
                        )}
                        {visit.status === 'completed' && (
                          <>
                            <button
                              onClick={() => handleEditVisit(visit.id || visit._id || '')}
                              className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleViewPlan(visit.id || visit._id || '')}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                            >
                              View Plan
                            </button>
                            <button
                              onClick={() => handleSaveAsPdf(visit.id || visit._id || '')}
                              className="text-purple-600 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded"
                            >
                              Save PDF
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteVisit(visit.id || visit._id || '')}
                          className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-white">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No visits</h3>
            <p className="mt-1 text-sm text-gray-500">
              {visits.length === 0 ? "You haven't created any visits yet." : "No visits match your current filters."}
            </p>
            {visits.length === 0 && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewVisitForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  New Visit
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


