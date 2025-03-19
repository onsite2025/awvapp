'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  CalendarIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { getTemplates } from '../../../lib/localStorage';

// Define interface for form data
interface NewVisitFormData {
  patientId: string;
  templateId: string;
  date: string;
  time: string;
  duration: number;
  provider: string;
  notes: string;
}

// Define mock patients for selection
const mockPatients = [
  { id: '1', name: 'Jane Cooper', dateOfBirth: '1985-02-12' },
  { id: '2', name: 'Wade Warren', dateOfBirth: '1972-06-18' },
  { id: '3', name: 'Esther Howard', dateOfBirth: '1968-12-04' },
  { id: '4', name: 'Cameron Williamson', dateOfBirth: '1991-10-25' },
  { id: '5', name: 'Brooklyn Simmons', dateOfBirth: '1979-05-30' },
];

// Define mock providers
const mockProviders = [
  { id: 'p1', name: 'Dr. Smith' },
  { id: 'p2', name: 'Dr. Johnson' },
  { id: 'p3', name: 'Dr. Williams' },
  { id: 'p4', name: 'Dr. Davis' },
];

// Default durations in minutes
const defaultDurations = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1 hour 30 minutes' },
];

// Create a client component that uses searchParams
function NewVisitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  
  // Form state
  const [formData, setFormData] = useState<NewVisitFormData>({
    patientId: patientIdFromUrl || '',
    templateId: '',
    date: '',
    time: '',
    duration: 45,
    provider: '',
    notes: '',
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load templates on component mount
  useEffect(() => {
    const loadTemplates = () => {
      try {
        const savedTemplates = getTemplates();
        setTemplates(savedTemplates);
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };

    loadTemplates();
  }, []);

  // Format date for display
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Set default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData(prev => ({
      ...prev,
      date: formatDateForInput(tomorrow)
    }));
  }, []);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.patientId) {
      newErrors.patientId = 'Please select a patient';
    }
    
    if (!formData.templateId) {
      newErrors.templateId = 'Please select a template';
    }
    
    if (!formData.date) {
      newErrors.date = 'Please select a date';
    }
    
    if (!formData.time) {
      newErrors.time = 'Please select a time';
    }
    
    if (!formData.provider) {
      newErrors.provider = 'Please select a provider';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call to save visit
    setTimeout(() => {
      console.log('Scheduling new visit with data:', formData);
      setIsSubmitting(false);
      setSubmitSuccess(true);
      
      // Redirect to visits page after success
      setTimeout(() => {
        router.push('/visits');
      }, 1500);
    }, 1000);
  };

  // Get patient name by ID
  const getPatientName = (id: string): string => {
    const patient = mockPatients.find(p => p.id === id);
    return patient ? patient.name : '';
  };

  // If submitted successfully, show success message
  if (submitSuccess) {
    return (
      <div className="bg-white shadow sm:rounded-lg p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-3 text-lg leading-6 font-medium text-gray-900">Visit Scheduled Successfully!</h3>
        <p className="mt-2 text-sm text-gray-500">
          Your visit has been scheduled. Redirecting to visits page...
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard-visits"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Visits
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Schedule New Visit</h1>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <form onSubmit={handleSubmit}>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Patient Selection */}
              <div className="sm:col-span-2">
                <label htmlFor="patientId" className="block text-sm font-medium text-gray-700">
                  Patient*
                </label>
                <div className="mt-1">
                  <select
                    id="patientId"
                    name="patientId"
                    value={formData.patientId}
                    onChange={handleChange}
                    className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                      errors.patientId ? 'ring-red-300' : 'ring-gray-300'
                    } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6`}
                  >
                    <option value="">Select a patient</option>
                    {mockPatients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} (DOB: {new Date(patient.dateOfBirth).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                  {errors.patientId && (
                    <p className="mt-2 text-sm text-red-600">{errors.patientId}</p>
                  )}
                </div>
                {formData.patientId && (
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <UserIcon className="mr-1 h-4 w-4 text-gray-400" />
                    Selected: {getPatientName(formData.patientId)}
                  </div>
                )}
              </div>

              {/* Template Selection */}
              <div className="sm:col-span-2">
                <label htmlFor="templateId" className="block text-sm font-medium text-gray-700">
                  Template*
                </label>
                <div className="mt-1">
                  <select
                    id="templateId"
                    name="templateId"
                    value={formData.templateId}
                    onChange={handleChange}
                    className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                      errors.templateId ? 'ring-red-300' : 'ring-gray-300'
                    } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6`}
                  >
                    <option value="">Select a template</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  {errors.templateId && (
                    <p className="mt-2 text-sm text-red-600">{errors.templateId}</p>
                  )}
                </div>
                {templates.length === 0 && (
                  <p className="mt-2 text-sm text-yellow-600">
                    No templates available. <Link href="/templates/new" className="text-blue-600 hover:text-blue-500">Create a template</Link>
                  </p>
                )}
              </div>

              {/* Date Selection */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Date*
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="date"
                    name="date"
                    id="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={`block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ${
                      errors.date ? 'ring-red-300' : 'ring-gray-300'
                    } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6`}
                  />
                </div>
                {errors.date && (
                  <p className="mt-2 text-sm text-red-600">{errors.date}</p>
                )}
              </div>

              {/* Time Selection */}
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                  Time*
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ClockIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="time"
                    name="time"
                    id="time"
                    value={formData.time}
                    onChange={handleChange}
                    className={`block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ${
                      errors.time ? 'ring-red-300' : 'ring-gray-300'
                    } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6`}
                  />
                </div>
                {errors.time && (
                  <p className="mt-2 text-sm text-red-600">{errors.time}</p>
                )}
              </div>

              {/* Duration Selection */}
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                  Duration
                </label>
                <select
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                >
                  {defaultDurations.map(duration => (
                    <option key={duration.value} value={duration.value}>
                      {duration.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Provider Selection */}
              <div>
                <label htmlFor="provider" className="block text-sm font-medium text-gray-700">
                  Provider*
                </label>
                <select
                  id="provider"
                  name="provider"
                  value={formData.provider}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                    errors.provider ? 'ring-red-300' : 'ring-gray-300'
                  } focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6`}
                >
                  <option value="">Select a provider</option>
                  {mockProviders.map(provider => (
                    <option key={provider.id} value={provider.name}>
                      {provider.name}
                    </option>
                  ))}
                </select>
                {errors.provider && (
                  <p className="mt-2 text-sm text-red-600">{errors.provider}</p>
                )}
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <div className="mt-1">
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Add any special notes or instructions for this visit..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${
                isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Visit'}
            </button>
            <Link
              href="/visits"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function NewVisitPage() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <NewVisitForm />
      </Suspense>
    </div>
  );
} 