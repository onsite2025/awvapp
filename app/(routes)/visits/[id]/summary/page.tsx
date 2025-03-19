'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  PrinterIcon,
  EnvelopeIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { getTemplates } from '../../../../lib/localStorage';

// Define interfaces for our data model
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  dateOfBirth: string;
}

interface VisitSummary {
  id: string;
  patientId: string;
  templateId: string;
  date: string;
  completedDate: string;
  provider: string;
  status: 'completed';
  answers: Answer[];
  recommendations: RecommendationItem[];
  notes?: string;
}

interface Answer {
  questionId: string;
  text?: string;
  optionIds?: string[];
}

interface RecommendationItem {
  id: string;
  text: string;
  category: string;
  selected: boolean;
}

type PageParams = {
  id: string;
};

// Mock data
const mockPatient: Patient = {
  id: '1',
  name: 'Jane Cooper',
  age: 56,
  gender: 'Female',
  dateOfBirth: '1967-05-10'
};

const mockVisitSummary: VisitSummary = {
  id: 'v1',
  patientId: '1',
  templateId: 'template1',
  date: '2023-05-15',
  completedDate: new Date().toISOString(),
  provider: 'Dr. Smith',
  status: 'completed',
  answers: [
    { questionId: 'q1', text: 'Yes, I exercise regularly.' },
    { questionId: 'q2', optionIds: ['opt1'] },
    { questionId: 'q3', optionIds: ['opt2', 'opt3'] },
    { questionId: 'q4', text: 'I take medication for hypertension.' }
  ],
  recommendations: [
    { id: 'r1', text: 'Continue with regular exercise routine', category: 'Exercise', selected: true },
    { id: 'r2', text: 'Schedule a follow-up appointment in 3 months', category: 'Follow-up', selected: true },
    { id: 'r3', text: 'Maintain a balanced diet with reduced sodium', category: 'Nutrition', selected: true },
    { id: 'r4', text: 'Monitor blood pressure weekly', category: 'Monitoring', selected: true }
  ],
  notes: 'Patient appears to be managing well with current treatment plan. Discussed importance of medication adherence.'
};

export default function VisitSummaryPage({ params }: { params: PageParams }) {
  const visitId = params.id;
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient>(mockPatient);
  const [visit, setVisit] = useState<VisitSummary>({...mockVisitSummary, id: visitId});
  const [template, setTemplate] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Initialize data
  useEffect(() => {
    const loadVisitData = async () => {
      setIsLoading(true);
      try {
        // In a real application, this would fetch the visit data from an API
        // For now, we'll use mock data and modify it slightly to match the visitId
        
        // Get templates from localStorage to display question text
        const templates = getTemplates();
        
        if (templates.length === 0) {
          setError('No templates found to display summary');
          setIsLoading(false);
          return;
        }
        
        // For demo, use the first template
        setTemplate(templates[0]);
        
        // Initialize all sections as expanded
        const sectionsState: Record<string, boolean> = {};
        templates[0].sections.forEach((section: any) => {
          sectionsState[section.id] = true;
        });
        setExpandedSections(sectionsState);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading visit data:', error);
        setError('Failed to load visit summary');
        setIsLoading(false);
      }
    };

    loadVisitData();
  }, [visitId]);

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Handle print functionality
  const handlePrint = () => {
    window.print();
    setShowPrintModal(false);
  };

  // Copy summary link to clipboard
  const copyToClipboard = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      },
      () => {
        console.error('Failed to copy link');
      }
    );
  };

  // Get question text by ID
  const getQuestionById = (questionId: string) => {
    if (!template) return { text: 'Unknown question', type: 'TEXT' };
    
    for (const section of template.sections) {
      for (const question of section.questions) {
        if (question.id === questionId) {
          return question;
        }
      }
    }
    
    return { text: 'Unknown question', type: 'TEXT' };
  };

  // Get option text by IDs
  const getOptionText = (questionId: string, optionIds: string[]) => {
    if (!template) return 'Unknown option';
    
    const question = getQuestionById(questionId);
    if (!question.options) return 'No options available';
    
    return optionIds
      .map(optionId => {
        const option = question.options.find((opt: any) => opt.id === optionId);
        return option ? option.text : 'Unknown option';
      })
      .join(', ');
  };

  // Render answer value based on question type
  const renderAnswerValue = (answer: Answer) => {
    const question = getQuestionById(answer.questionId);
    
    if (['TEXT', 'TEXTAREA', 'NUMBER', 'DATE'].includes(question.type)) {
      return <span>{answer.text || 'Not provided'}</span>;
    }
    
    if (['SELECT', 'RADIO', 'CHECKBOX', 'MULTISELECT'].includes(question.type)) {
      return <span>{answer.optionIds?.length ? getOptionText(answer.questionId, answer.optionIds) : 'None selected'}</span>;
    }
    
    return <span>Unknown answer format</span>;
  };

  // Print modal
  const renderPrintModal = () => (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <PrinterIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Print Visit Summary</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    This will open your browser's print dialog to print the visit summary.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={handlePrint}
            >
              Print
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={() => setShowPrintModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Share modal
  const renderShareModal = () => (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <ShareIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Share Visit Summary</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Choose how you would like to share this visit summary.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 space-y-4">
              <button
                onClick={copyToClipboard}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <DocumentDuplicateIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span>Copy link to clipboard</span>
                </div>
                {copySuccess && (
                  <CheckIcon className="h-5 w-5 text-green-500" />
                )}
              </button>
              
              <button
                onClick={() => {
                  window.location.href = `mailto:?subject=Visit Summary for ${patient.name}&body=View the visit summary at: ${window.location.href}`;
                }}
                className="w-full flex items-center px-4 py-3 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              >
                <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                <span>Email summary</span>
              </button>
              
              <button
                onClick={() => {
                  // In a real app, this would generate a PDF and trigger download
                  setShowShareModal(false);
                  alert('PDF download functionality would be implemented here');
                }}
                className="w-full flex items-center px-4 py-3 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              >
                <ArrowDownTrayIcon className="h-5 w-5 text-gray-400 mr-3" />
                <span>Download as PDF</span>
              </button>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
              onClick={() => setShowShareModal(false)}
            >
              Close
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
    <div className="print:bg-white print:w-full">
      <div className="mb-6 print:hidden">
        <Link
          href="/dashboard-visits"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Visits
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Visit Summary</h1>
      </div>

      {/* Print title (only visible when printing) */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Visit Summary</h1>
      </div>

      {/* Patient and Visit Info */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6 print:mb-8 print:border print:border-gray-200">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Patient Information</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{patient.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Gender</dt>
              <dd className="mt-1 text-sm text-gray-900">{patient.gender}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date(patient.dateOfBirth).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Age</dt>
              <dd className="mt-1 text-sm text-gray-900">{patient.age} years</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Visit Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date(visit.date).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Provider</dt>
              <dd className="mt-1 text-sm text-gray-900">{visit.provider}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex space-x-4 print:hidden">
        <button
          type="button"
          onClick={() => setShowPrintModal(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PrinterIcon className="h-5 w-5 mr-2" />
          Print
        </button>
        <button
          type="button"
          onClick={() => setShowShareModal(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ShareIcon className="h-5 w-5 mr-2" />
          Share
        </button>
      </div>

      {/* Recommendations Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6 print:mb-8 print:border print:border-gray-200">
        <div className="px-4 py-5 sm:px-6 bg-blue-50 print:bg-white">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recommendations</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Based on the assessment, the following recommendations were made.
          </p>
        </div>
        <div className="border-t border-gray-200">
          {visit.recommendations.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {visit.recommendations
                .filter(rec => rec.selected)
                .sort((a, b) => a.category.localeCompare(b.category))
                .map((rec) => (
                  <li key={rec.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{rec.text}</p>
                        <p className="text-xs text-gray-500 mt-1">{rec.category}</p>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <div className="px-4 py-5 sm:px-6 text-sm text-gray-500">
              No recommendations were provided for this visit.
            </div>
          )}
        </div>
      </div>

      {/* Assessment Answers */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6 print:mb-8 print:border print:border-gray-200">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Assessment Details</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Detailed responses from the visit assessment.
          </p>
        </div>
        <div className="border-t border-gray-200">
          {template && template.sections.map((section: any) => (
            <div key={section.id} className="border-b border-gray-200 last:border-b-0">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full px-4 py-4 sm:px-6 flex justify-between items-center hover:bg-gray-50 focus:outline-none print:hover:bg-white"
              >
                <h4 className="text-md font-medium text-gray-900">{section.title}</h4>
                {expandedSections[section.id] ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500 print:hidden" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500 print:hidden" />
                )}
              </button>
              
              {(expandedSections[section.id] || true) && ( // Always show in print mode
                <div className={`px-4 pb-4 sm:px-6 ${expandedSections[section.id] ? '' : 'hidden print:block'}`}>
                  <dl className="space-y-4">
                    {section.questions.map((question: any) => {
                      const answer = visit.answers.find(a => a.questionId === question.id);
                      
                      if (!answer) return null;
                      
                      return (
                        <div key={question.id} className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
                          <dt className="text-sm font-medium text-gray-500">{question.text}</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {answer ? renderAnswerValue(answer) : 'Not answered'}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Provider Notes Section */}
      {visit.notes && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6 print:mb-8 print:border print:border-gray-200">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Provider Notes</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <p className="text-sm text-gray-900 whitespace-pre-line">{visit.notes}</p>
          </div>
        </div>
      )}

      {/* Footer with completion date */}
      <div className="text-sm text-gray-500 mb-8 print:mb-0">
        Visit completed on {new Date(visit.completedDate).toLocaleDateString()} at {new Date(visit.completedDate).toLocaleTimeString()}
      </div>

      {/* Modals */}
      {showPrintModal && renderPrintModal()}
      {showShareModal && renderShareModal()}
    </div>
  );
} 