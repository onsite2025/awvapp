'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/app/hooks/useToast';
import { 
  PrinterIcon, 
  PencilIcon, 
  TrashIcon, 
  PlusCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Types
interface Recommendation {
  id: string;
  text: string;
  category: string;
  priority?: 'high' | 'medium' | 'low';
  isEdited?: boolean;
}

interface Visit {
  _id: string;
  patientId: string;
  patientName: string;
  date: string;
  responses: any[];
  status: string;
  templateId: string;
  templateName: string;
  [key: string]: any;
}

interface Plan {
  _id: string;
  visitId: string;
  recommendations: Recommendation[];
  createdAt: string;
  updatedAt: string;
}

// Standalone PersonalizedPlanPage component
export default function PersonalizedPlanPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  
  // For compatibility with current Next.js version, handle params safely
  const visitId = typeof params?.id === 'string' ? params.id : '';
  
  // State
  const [visit, setVisit] = useState<Visit | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Editing states
  const [editingRecommendation, setEditingRecommendation] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [newRecommendation, setNewRecommendation] = useState<{text: string, category: string} | null>(null);
  
  // Debug state
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  
  // Recommendation categories
  const CATEGORIES = [
    'Preventive Care',
    'Lifestyle',
    'Exercise',
    'Nutrition',
    'Follow-up',
    'Medication',
    'Mental Health',
    'Specialist Referral',
    'Screenings',
    'Other'
  ];

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [visitId]);

  // Function to load visit and plan data
  const loadData = async () => {
    if (!visitId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch visit data
      const visitResponse = await axios.get(`/api/visits/${visitId}`);
      const visitData = visitResponse.data;
      setVisit(visitData);
      
      console.log('Visit data loaded:', visitData);
      
      // Fetch plan or create a new one if it doesn't exist
      try {
        const planResponse = await axios.get(`/api/plans?visitId=${visitId}`);
        const planData = planResponse.data;
        
        if (planData && planData.length > 0) {
          setPlan(planData[0]);
          console.log('Plan data loaded:', planData[0]);
        } else {
          // Create a new plan if one doesn't exist
          await createNewPlan(visitData);
        }
      } catch (planError: any) {
        if (planError.response && planError.response.status === 404) {
          // Plan doesn't exist, create a new one
          await createNewPlan(visitData);
        } else {
          throw planError;
        }
      }
    } catch (error: any) {
      console.error('Failed to load data:', error);
      setError(`Failed to load data: ${error.message || 'Unknown error'}`);
      toast.error('Error loading plan data');
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new plan with recommendations extracted from visit responses
  const createNewPlan = async (visitData: Visit) => {
    try {
      console.log('Creating new plan for visit:', visitData);
      
      // Extract recommendations from visit responses
      const recommendations = extractRecommendationsFromResponses(visitData.responses);
      
      console.log('Extracted recommendations:', recommendations);
      
      // Log detailed information about the recommendations source for debugging
      if (visitData.responses && visitData.responses.length > 0) {
        console.log('Response recommendation sources:');
        visitData.responses.forEach((response, idx) => {
          const question = response.question;
          const answer = response.answer;
          
          if (question && question.type === 'multiple_choice' && answer) {
            const matchingOption = question.options?.find((opt: any) => opt.text === answer);
            console.log(`Response ${idx+1}: Q="${question.text}" A="${answer}"`);
            console.log(`  - Has matching option: ${Boolean(matchingOption)}`);
            console.log(`  - Option-specific recommendations: ${matchingOption?.recommendations?.length || 0}`);
            console.log(`  - Default recommendations: ${question.defaultRecommendations?.length || 0}`);
          } else if (question) {
            console.log(`Response ${idx+1}: Q="${question.text}" A="${answer}"`);
            console.log(`  - Default recommendations: ${question.defaultRecommendations?.length || 0}`);
          }
        });
      }
      
      // Create a request object with all needed data
      const requestData = {
        visitId,
        recommendations,
        patientId: visitData.patientId,
        patientName: visitData.patientName,
        visitDate: visitData.date,
        templateId: visitData.templateId,
        providerId: visitData.providerId || '',
        providerName: visitData.providerName || '',
      };
      
      // Create a new plan
      const response = await axios.post('/api/plans', requestData);
      setPlan(response.data);
      console.log('New plan created:', response.data);
      toast.success('Health plan created successfully');
    } catch (error: any) {
      console.error('Error creating plan:', error);
      console.error('Error response:', error.response?.data);
      
      // Detailed error info for debugging
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
      }
      
      setError(`Error creating plan: ${error.message || 'Unknown error'}`);
      toast.error('Failed to create health plan');
      
      // Try a fallback approach with minimal data if we got a 400 error
      if (error.response && error.response.status === 400) {
        try {
          console.log('Attempting fallback plan creation with minimal data');
          const fallbackData = {
            visitId,
            recommendations: getDefaultRecommendations(),
          };
          
          const fallbackResponse = await axios.post('/api/plans', fallbackData);
          setPlan(fallbackResponse.data);
          console.log('Fallback plan created:', fallbackResponse.data);
          toast.success('Basic health plan created');
        } catch (fallbackError) {
          console.error('Fallback plan creation failed:', fallbackError);
        }
      }
    }
  };

  // Extract recommendations from visit responses
  const extractRecommendationsFromResponses = (responses: any[]): Recommendation[] => {
    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return getDefaultRecommendations();
    }
    
    const recommendations: Recommendation[] = [];
    
    try {
      // Process each response for potential recommendations
      responses.forEach(response => {
        // Skip empty responses
        if (!response || !response.question) return;
        
        const questionText = response.question.text || '';
        const answer = response.answer;
        
        // Skip if no answer
        if (answer === undefined || answer === null || answer === '') return;
        
        // Look for response-specific recommendations first
        if (response.question.type === 'multiple_choice' && 
            response.question.options && 
            Array.isArray(response.question.options)) {
          
          // For multiple choice, find the matching option and its recommendations
          if (typeof answer === 'string') {
            const matchingOption = response.question.options.find((opt: any) => 
              opt.text === answer
            );
            
            if (matchingOption && matchingOption.recommendations && 
                Array.isArray(matchingOption.recommendations) && 
                matchingOption.recommendations.length > 0) {
              
              // Add recommendations from this option
              matchingOption.recommendations.forEach((rec: any) => {
                if (rec && rec.text) {
                  recommendations.push({
                    id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    text: rec.text,
                    category: rec.category || 'Other',
                    priority: 'medium'
                  });
                }
              });
            }
          }
        }
        
        // If no option-specific recommendations were found, check for default recommendations
        if (response.question.defaultRecommendations && 
            Array.isArray(response.question.defaultRecommendations) && 
            response.question.defaultRecommendations.length > 0) {
          
          response.question.defaultRecommendations.forEach((rec: any) => {
            if (rec && rec.text) {
              recommendations.push({
                id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text: rec.text,
                category: rec.category || 'Other',
                priority: 'medium'
              });
            }
          });
        }
        
        // Fallback to dynamically generating recommendations based on response content
        // (only if no template-defined recommendations were found for this response)
        const hasRecommendationsForThisQuestion = recommendations.some(rec => 
          rec.id.includes(response.question.id)
        );
        
        if (!hasRecommendationsForThisQuestion) {
          // Check for risk factors or conditions that need recommendations
          if (typeof answer === 'string' && answer.toLowerCase().includes('yes')) {
            // For yes/no questions where answer is yes, create a recommendation
            if (questionText.toLowerCase().includes('smoke') || questionText.toLowerCase().includes('tobacco')) {
              recommendations.push({
                id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text: 'Consider smoking cessation program or counseling',
                category: 'Lifestyle',
                priority: 'high'
              });
            }
            
            if (questionText.toLowerCase().includes('alcohol') && questionText.toLowerCase().includes('excess')) {
              recommendations.push({
                id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text: 'Consider reducing alcohol consumption; aim for no more than 1-2 drinks per day',
                category: 'Lifestyle',
                priority: 'medium'
              });
            }
            
            if (questionText.toLowerCase().includes('exercise') && questionText.toLowerCase().includes('regularly') && answer.toLowerCase().includes('no')) {
              recommendations.push({
                id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text: 'Start with 150 minutes of moderate physical activity per week',
                category: 'Exercise',
                priority: 'medium'
              });
            }
          }
          
          // Handle numeric values for BMI, BP, etc.
          if (typeof answer === 'number' || (typeof answer === 'string' && !isNaN(Number(answer)))) {
            const numValue = Number(answer);
            
            if (questionText.toLowerCase().includes('bmi') && numValue > 30) {
              recommendations.push({
                id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text: 'Weight management program recommended; aim for 5-10% weight loss',
                category: 'Nutrition',
                priority: 'high'
              });
            }
            
            if (questionText.toLowerCase().includes('blood pressure') || questionText.toLowerCase().includes('bp')) {
              if (numValue > 140) { // Simplistic - normally would check systolic/diastolic
                recommendations.push({
                  id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  text: 'Monitor blood pressure regularly; consider dietary modifications',
                  category: 'Follow-up',
                  priority: 'high'
                });
              }
            }
          }
        }
      });
      
      // If no recommendations were generated, use defaults
      if (recommendations.length === 0) {
        return getDefaultRecommendations();
      }
      
      // Remove duplicates (there might be overlapping recommendations)
      const uniqueRecommendations = recommendations.filter((rec, index, self) =>
        index === self.findIndex(r => r.text === rec.text)
      );
      
      return uniqueRecommendations;
    } catch (error) {
      console.error('Error extracting recommendations:', error);
      return getDefaultRecommendations();
    }
  };
  
  // Helper function to determine appropriate category based on question and answer
  const determineCategory = (questionText: string, answer: any): string => {
    const text = questionText.toLowerCase();
    
    if (text.includes('exercise') || text.includes('physical activity')) {
      return 'Exercise';
    } else if (text.includes('diet') || text.includes('nutrition') || text.includes('food')) {
      return 'Nutrition';
    } else if (text.includes('medication') || text.includes('drug')) {
      return 'Medication';
    } else if (text.includes('follow') || text.includes('appointment')) {
      return 'Follow-up';
    } else if (text.includes('mental') || text.includes('stress') || text.includes('anxiety') || text.includes('depression')) {
      return 'Mental Health';
    } else if (text.includes('specialist') || text.includes('referral')) {
      return 'Specialist Referral';
    } else if (text.includes('screening') || text.includes('test') || text.includes('exam')) {
      return 'Screenings';
    } else {
      return 'Other';
    }
  };
  
  // Get default recommendations if none can be extracted
  const getDefaultRecommendations = (): Recommendation[] => {
    return [
      {
        id: `rec-${Date.now()}-1`,
        text: 'Schedule annual physical exam',
        category: 'Preventive Care',
        priority: 'medium'
      },
      {
        id: `rec-${Date.now()}-2`,
        text: 'Maintain regular exercise routine (150 minutes per week)',
        category: 'Exercise',
        priority: 'medium'
      },
      {
        id: `rec-${Date.now()}-3`,
        text: 'Follow a balanced diet rich in fruits and vegetables',
        category: 'Nutrition',
        priority: 'medium'
      }
    ];
  };
  
  // Handle print action
  const handlePrint = () => {
    setIsPrinting(true);
    
    // Use setTimeout to give time for CSS to apply
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };
  
  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!plan || !visit) return;
    
    try {
      toast.info('Preparing PDF document...');
      
      const planElement = document.getElementById('plan-content');
      if (!planElement) {
        throw new Error('Plan content not found');
      }
      
      const canvas = await html2canvas(planElement, {
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Save with a formatted filename
      const fileName = `HealthPlan_${visit.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      console.error('Error creating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };
  
  // Edit recommendation
  const handleEditRecommendation = (recommendation: Recommendation) => {
    setEditingRecommendation(recommendation.id);
    setEditedText(recommendation.text);
    setEditedCategory(recommendation.category);
  };
  
  // Save edited recommendation
  const handleSaveRecommendation = async (id: string) => {
    if (!plan) return;
    
    try {
      const updatedRecommendations = plan.recommendations.map(rec => 
        rec.id === id ? { ...rec, text: editedText, category: editedCategory, isEdited: true } : rec
      );
      
      // Update local state first for better UX
      setPlan({ ...plan, recommendations: updatedRecommendations });
      
      // Save to API
      await axios.put(`/api/plans/${plan._id}`, { 
        recommendations: updatedRecommendations 
      });
      
      setEditingRecommendation(null);
      toast.success('Recommendation updated');
    } catch (error) {
      console.error('Error updating recommendation:', error);
      toast.error('Failed to update recommendation');
    }
  };
  
  // Delete recommendation
  const handleDeleteRecommendation = async (id: string) => {
    if (!plan) return;
    
    if (!window.confirm('Are you sure you want to remove this recommendation?')) {
      return;
    }
    
    try {
      const updatedRecommendations = plan.recommendations.filter(rec => rec.id !== id);
      
      // Update local state first for better UX
      setPlan({ ...plan, recommendations: updatedRecommendations });
      
      // Save to API
      await axios.put(`/api/plans/${plan._id}`, { 
        recommendations: updatedRecommendations 
      });
      
      toast.success('Recommendation removed');
    } catch (error) {
      console.error('Error removing recommendation:', error);
      toast.error('Failed to remove recommendation');
    }
  };
  
  // Add new recommendation
  const handleAddRecommendation = () => {
    setNewRecommendation({ text: '', category: CATEGORIES[0] });
  };
  
  // Save new recommendation
  const handleSaveNewRecommendation = async () => {
    if (!plan || !newRecommendation) return;
    
    if (!newRecommendation.text.trim()) {
      toast.error('Recommendation text cannot be empty');
      return;
    }
    
    try {
      const newRec: Recommendation = {
        id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: newRecommendation.text.trim(),
        category: newRecommendation.category,
        priority: 'medium',
        isEdited: true
      };
      
      const updatedRecommendations = [...plan.recommendations, newRec];
      
      // Update local state first for better UX
      setPlan({ ...plan, recommendations: updatedRecommendations });
      
      // Save to API
      await axios.put(`/api/plans/${plan._id}`, { 
        recommendations: updatedRecommendations 
      });
      
      setNewRecommendation(null);
      toast.success('Recommendation added');
    } catch (error) {
      console.error('Error adding recommendation:', error);
      toast.error('Failed to add recommendation');
    }
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingRecommendation(null);
    setNewRecommendation(null);
  };
  
  // Group recommendations by category
  const groupedRecommendations = () => {
    if (!plan?.recommendations || plan.recommendations.length === 0) {
      return {};
    }
    
    return plan.recommendations.reduce<{[key: string]: Recommendation[]}>((groups, rec) => {
      const category = rec.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(rec);
      return groups;
    }, {});
  };
  
  // Get back to visit details
  const handleBackToVisit = () => {
    router.push(`/visits/${visitId}`);
  };
  
  // Render grouped recommendations for printing/display
  const renderRecommendations = (grouped: {[key: string]: Recommendation[]}) => {
    // Sort categories for consistent display
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      // Put high priority categories first
      if (a === 'Preventive Care') return -1;
      if (b === 'Preventive Care') return 1;
      if (a === 'Follow-up') return -1;
      if (b === 'Follow-up') return 1;
      return a.localeCompare(b);
    });
    
    return sortedCategories.map(category => (
      <div key={category} className="mb-6">
        <h3 className="text-lg font-medium text-blue-800 mb-2 border-b border-blue-200 pb-1">
          {category}
        </h3>
        <ul className="space-y-2">
          {grouped[category].map(rec => (
            <li key={rec.id} className="ml-5 relative">
              <span className="absolute -left-5 top-1.5 h-2 w-2 bg-blue-600 rounded-full"></span>
              <div className="text-gray-700">
                {rec.text}
              </div>
            </li>
          ))}
        </ul>
      </div>
    ));
  };

  // Component rendering
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-lg text-gray-600">Loading health plan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-4 max-w-lg w-full">
          <h2 className="text-lg font-semibold mb-2">Error Loading Plan</h2>
          <p>{error}</p>
        </div>
        <button 
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
        <button 
          onClick={handleBackToVisit}
          className="mt-3 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to Visit Details
        </button>
      </div>
    );
  }

  if (!visit || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">No plan data available. Please try again.</p>
      </div>
    );
  }

  // Main content with print styles and recommendations
  return (
    <>
      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          #plan-content, #plan-content * {
            visibility: visible;
          }
          
          #plan-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      <div className={`bg-gray-50 min-h-screen ${isPrinting ? 'p-0' : 'p-4 md:p-8'}`}>
        {/* Header & Controls - Not shown when printing */}
        <div className={`mb-6 ${isPrinting ? 'no-print' : ''}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">
              Personalized Health Plan
            </h1>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleBackToVisit}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 flex items-center text-sm"
              >
                Back to Visit
              </button>
              
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 border border-blue-500 bg-blue-50 rounded-md text-blue-700 hover:bg-blue-100 flex items-center text-sm"
              >
                <PrinterIcon className="h-4 w-4 mr-1" />
                Print
              </button>
              
              <button
                onClick={handleDownloadPDF}
                className="px-3 py-1.5 border border-blue-500 bg-blue-50 rounded-md text-blue-700 hover:bg-blue-100 flex items-center text-sm"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                Save PDF
              </button>
              
              <button
                onClick={handleAddRecommendation}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-sm"
              >
                <PlusCircleIcon className="h-4 w-4 mr-1" />
                Add Recommendation
              </button>
            </div>
          </div>
        </div>
        
        {/* Debug information toggle - only in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4">
            <button 
              onClick={() => setIsDebugVisible(!isDebugVisible)}
              className="text-xs text-gray-500 underline"
            >
              {isDebugVisible ? 'Hide Debug Info' : 'Show Debug Info'}
            </button>
            
            {isDebugVisible && visit && (
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-96">
                <h4 className="font-bold mb-1">Visit ID: {visit._id}</h4>
                <div className="mb-2">
                  <strong>Status:</strong> {visit.status}
                </div>
                <div className="mb-2">
                  <strong>Template:</strong> {visit.templateName} (ID: {visit.templateId})
                </div>
                <div className="mb-2">
                  <strong>Responses Count:</strong> {visit.responses?.length || 0}
                </div>
                <div className="border-t border-gray-300 my-2 pt-2">
                  <strong>Response Details:</strong>
                  {visit.responses && visit.responses.length > 0 ? (
                    <div className="mt-1 space-y-2">
                      {visit.responses.map((response: any, idx: number) => (
                        <div key={idx} className="border border-gray-200 p-1 rounded">
                          <div><strong>Question:</strong> {response.question?.text}</div>
                          <div><strong>Answer:</strong> {typeof response.answer === 'object' 
                            ? JSON.stringify(response.answer) 
                            : response.answer}
                          </div>
                          <div>
                            <strong>Options:</strong> {response.question?.options 
                              ? `${response.question.options.length} options` 
                              : 'No options'
                            }
                          </div>
                          <div>
                            <strong>Recommendations:</strong> {
                              (response.question?.options?.find((o: any) => o.text === response.answer)?.recommendations?.length || 0) > 0
                                ? `${response.question.options.find((o: any) => o.text === response.answer).recommendations.length} option-specific` 
                                : (response.question?.defaultRecommendations?.length || 0) > 0
                                  ? `${response.question.defaultRecommendations.length} defaults`
                                  : 'None found'
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-red-500 mt-1">No responses found!</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Plan Content - Printable area */}
        <div 
          id="plan-content" 
          className={`bg-white rounded-lg shadow-md ${isPrinting ? '' : 'p-6 md:p-8'}`}
        >
          {/* Plan Header */}
          <div className="mb-8 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-blue-800 mb-1">
              Personalized Health Plan
            </h2>
            <p className="text-base text-gray-600">
              {visit.patientName} - {new Date(visit.date).toLocaleDateString()}
            </p>
          </div>
          
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-gray-700 leading-relaxed">
              This personalized health plan has been developed based on your Annual Wellness Visit. 
              The recommendations below are designed to help you maintain and improve your health 
              over the coming year. Please discuss any questions about these recommendations with 
              your healthcare provider.
            </p>
          </div>
          
          {/* Recommendations Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-6 pb-2 border-b border-blue-200">
              Health Recommendations
            </h2>
            
            {/* Display add/edit forms if active */}
            {newRecommendation && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-medium mb-3">Add New Recommendation</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recommendation Text
                    </label>
                    <textarea
                      value={newRecommendation.text}
                      onChange={(e) => setNewRecommendation({...newRecommendation, text: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                    ></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={newRecommendation.category}
                      onChange={(e) => setNewRecommendation({...newRecommendation, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveNewRecommendation}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Save Recommendation
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Grouped Recommendations */}
            {plan.recommendations.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-gray-500">No recommendations yet. Add some using the button above.</p>
              </div>
            ) : (
              <div className="recommendations-list">
                {Object.entries(groupedRecommendations()).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No recommendations available</p>
                  </div>
                ) : (
                  <>
                    {/* For editing mode (not shown when printing) */}
                    {!isPrinting && (
                      <div className="recommendations-editable mb-8">
                        {Object.entries(groupedRecommendations()).map(([category, recs]) => (
                          <div key={category} className="mb-6">
                            <h3 className="text-lg font-medium text-blue-800 mb-3 border-b border-blue-200 pb-1">
                              {category}
                            </h3>
                            <ul className="space-y-3">
                              {recs.map(rec => (
                                <li key={rec.id} className="p-3 bg-gray-50 rounded-md relative group">
                                  {editingRecommendation === rec.id ? (
                                    <div className="space-y-3">
                                      <textarea
                                        value={editedText}
                                        onChange={(e) => setEditedText(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        rows={2}
                                      ></textarea>
                                      
                                      <select
                                        value={editedCategory}
                                        onChange={(e) => setEditedCategory(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                      >
                                        {CATEGORIES.map(cat => (
                                          <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                      </select>
                                      
                                      <div className="flex justify-end space-x-2">
                                        <button
                                          onClick={handleCancelEdit}
                                          className="px-2 py-1 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => handleSaveRecommendation(rec.id)}
                                          className="px-2 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="pr-20 text-gray-700">{rec.text}</div>
                                      <div className="absolute top-3 right-3 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => handleEditRecommendation(rec)}
                                          className="text-blue-600 hover:text-blue-800"
                                          title="Edit recommendation"
                                        >
                                          <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRecommendation(rec.id)}
                                          className="text-red-600 hover:text-red-800"
                                          title="Delete recommendation"
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* For printing (simplified, clean version) */}
                    {isPrinting && (
                      <div className="recommendations-print">
                        {renderRecommendations(groupedRecommendations())}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Footer content - signature line etc. */}
          <div className="mt-12 pt-6 border-t border-gray-200">
            <div className="text-center text-sm text-gray-600">
              <p className="mb-6">
                Please contact our office if you have any questions about these recommendations.
              </p>
              
              <div className="mt-10 pt-8 flex items-end justify-center">
                <div className="border-t border-gray-400 w-64">
                  <p className="pt-1">
                    Healthcare Provider Signature / Date
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Add a "Back to top" button - not shown when printing */}
        {!isPrinting && (
          <div className="mt-8 text-center no-print">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-4 py-2 text-blue-600 border border-blue-300 rounded-full text-sm hover:bg-blue-50"
            >
              Back to top
            </button>
          </div>
        )}
      </div>
    </>
  );
} 