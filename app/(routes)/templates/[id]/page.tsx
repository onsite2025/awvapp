'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Template, Section, Question } from '../../../components/TemplateBuilder/TemplateBuilder';
import { ArrowLeftIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';

type PageParams = {
  id: string;
};

export default function TemplateViewPage({ params }: { params: PageParams }) {
  const router = useRouter();
  const id = params.id; // Access params directly for now as direct access is still supported
  const { user, loading: authLoading } = useAuth();
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load template data from API on component mount
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setIsLoading(true);
        
        // Get Firebase auth token if user is logged in
        let headers: HeadersInit = {};
        
        if (user) {
          const token = await user.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`/api/templates/${id}`, {
          headers
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Template not found');
          }
          throw new Error('Failed to fetch template');
        }
        
        const data = await response.json();
        setTemplate(data);
      } catch (err) {
        console.error('Error fetching template:', err);
        setError(err instanceof Error ? err.message : 'Failed to load template');
      } finally {
        setIsLoading(false);
      }
    };

    if (id && !authLoading) {
      fetchTemplate();
    }
  }, [id, authLoading]);

  // Format date to readable string
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get question type display name
  const getQuestionTypeDisplay = (type: string): string => {
    const typeMap: Record<string, string> = {
      'TEXT': 'Short Text',
      'TEXTAREA': 'Long Text',
      'SELECT': 'Dropdown Select',
      'MULTISELECT': 'Multi-Select',
      'CHECKBOX': 'Checkbox',
      'RADIO': 'Radio Button',
      'DATE': 'Date Picker',
      'NUMBER': 'Number Input'
    };
    return typeMap[type] || type;
  };

  // Handle template deletion
  const handleDeleteTemplate = async () => {
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
        
        // Navigate back to templates list
        router.push('/templates');
      } catch (err) {
        console.error('Error deleting template:', err);
        alert('Failed to delete template. Please try again.');
      }
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="spinner mb-4 h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-700">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="text-center py-12">
        <div className="mb-4 text-red-500">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-medium text-gray-900">{error || 'Template not found'}</h2>
        <p className="mt-2 text-gray-500">The template you're looking for does not exist or couldn't be loaded.</p>
        <div className="mt-6">
          <Link
            href="/templates"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/templates"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Templates
        </Link>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
          <div className="space-x-2">
            <Link
              href={`/templates/${id}/edit`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <PencilSquareIcon className="h-4 w-4 mr-2" />
              Edit
            </Link>
            <button
              type="button"
              onClick={handleDeleteTemplate}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Template Details */}
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Template Details</h2>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  template.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {template.isActive ? 'Active' : 'Inactive'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created By</dt>
              <dd className="mt-1 text-sm text-gray-900">{template.userId || 'Unknown'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(template.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(template.updatedAt)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">{template.description || 'No description provided'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Sections</dt>
              <dd className="mt-1 text-sm text-gray-900">{template.sectionCount}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Questions</dt>
              <dd className="mt-1 text-sm text-gray-900">{template.questionCount}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Template Structure */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Template Structure</h2>
        </div>

        {template.sections.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-gray-500">This template has no sections.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {template.sections.map((section, sectionIndex) => (
              <div key={section.id} className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Section {sectionIndex + 1}: {section.title}
                </h3>
                
                {section.description && (
                  <p className="text-sm text-gray-500 mb-4">{section.description}</p>
                )}

                {section.questions.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No questions in this section</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {section.questions.map((question, questionIndex) => (
                      <li key={question.id} className="bg-gray-50 p-4 rounded-md">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Q{questionIndex + 1}: {question.text || '(No question text)'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Type: {getQuestionTypeDisplay(question.type)} 
                              {question.isRequired && <span className="ml-2 text-red-600">*Required</span>}
                            </p>
                          </div>
                        </div>

                        {/* Options */}
                        {['SELECT', 'MULTISELECT', 'CHECKBOX', 'RADIO'].includes(question.type) && 
                         (question.options || []).length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-700 mb-1">Options:</p>
                            <ul className="pl-4 text-xs text-gray-600">
                              {(question.options || []).map(option => (
                                <li key={option.id} className="mb-2">
                                  <span className="font-medium">{option.text}</span>
                                  
                                  {/* Option-specific recommendations */}
                                  {option && option.recommendations && option.recommendations.length > 0 && (
                                    <div className="mt-1 ml-4 border-l-2 border-gray-200 pl-2">
                                      <p className="text-xs text-blue-600 font-medium">Recommendations if selected:</p>
                                      <ul className="list-disc pl-4 text-xs text-gray-500">
                                        {option.recommendations.map(rec => (
                                          <li key={rec.id}>
                                            {rec.text}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Default Recommendations */}
                        {question.defaultRecommendations && question.defaultRecommendations.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-700 mb-1">Default Recommendations:</p>
                            <ul className="pl-4 text-xs text-gray-600 list-disc">
                              {question.defaultRecommendations.map(rec => (
                                <li key={rec.id}>{rec.text}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 