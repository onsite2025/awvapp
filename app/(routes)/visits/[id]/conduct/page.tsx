'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ArrowLeftIcon, 
  XMarkIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { getTemplates, getTemplateById } from '../../../../lib/localStorage';
import { useAuth } from '@/app/contexts/AuthContext';

// Define necessary interfaces
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  dateOfBirth: string;
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
  source?: string;
  selected: boolean;
}

interface VisitSession {
  id: string;
  patientId: string;
  templateId: string;
  date: string;
  provider: string;
  status: string;
  currentSectionIndex: number;
  answers: Answer[];
  recommendations: RecommendationItem[];
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

const mockVisit: VisitSession = {
  id: 'v1',
  patientId: '1',
  templateId: '',  // Will be populated from URL parameter
  date: new Date().toISOString(),
  provider: 'Dr. Smith',
  status: 'in-progress',
  currentSectionIndex: 0,
  answers: [],
  recommendations: []
};

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 10);

// Define question types
interface Question {
  id: string;
  text: string;
  type: string;
  required?: boolean;
  options?: Array<{
    id: string;
    text: string;
    value: string;
    recommendations?: Array<{
      id: string;
      text: string;
      category: string;
    }>;
  }>;
  skipLogicRules?: Array<{
    id: string;
    condition: {
      questionId: string;
      operator: string;
      value: string;
    };
    action?: 'SHOW' | 'HIDE';
    targetType?: 'QUESTION' | 'SECTION';
    targetSectionId?: string;
  }>;
}

// Define section type
interface Section {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export default function ConductVisitPage({ params }: { params: PageParams }) {
  const router = useRouter();
  const { user } = useAuth();
  
  // For Next.js 14+, properly access params.id 
  // (For simpliciy we'll keep using it directly with a cast until we need to fully migrate)
  const visitId = params.id as string;
  
  // Define all state variables together at the top of the component
  const [visit, setVisit] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [loadComplete, setLoadComplete] = useState(false); // New state to track if data load is complete
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [navDirection, setNavDirection] = useState<'next' | 'prev' | null>(null);
  
  // Define secondary state variables that depend on primary ones
  // These will be computed when dependencies change
  const [skipChecked, setSkipChecked] = useState(false);
  
  // Template sections and navigation - compute these outside of render
  const sections = template?.sections || [];
  const currentSectionData = sections[currentSection] || { questions: [] };
  
  // Calculate progress percentage early to avoid inside render calculations
  const progressPercentage = sections.length > 0 
    ? Math.round(((currentSection + 1) / sections.length) * 100) 
    : 0;
  
  // Add state for recommendations and plan view
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [showPlan, setShowPlan] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  
  // Declare all hooks up front - this ensures consistent order in all renders
  
  // Load visit data - always include all hooks in every render
  useEffect(() => {
    const loadVisitData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get auth token
        let authHeader = {};
        const { auth } = await import('@/app/lib/firebase');
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          const token = await currentUser.getIdToken();
          authHeader = {
            'Authorization': `Bearer ${token}`
          };
        }
        
        // Fetch visit data
        const visitResponse = await fetch(`/api/visits/${visitId}`, {
          headers: {
            ...authHeader
          }
        });
        
        if (!visitResponse.ok) {
          throw new Error(`Error fetching visit: ${visitResponse.statusText}`);
        }
        
        const visitData = await visitResponse.json();
        setVisit(visitData);
        
        // If responses exist in the visit data, load them
        if (visitData.responses) {
          setResponses(visitData.responses);
        }
        
        // Fetch the template associated with this visit
        if (visitData.templateId) {
          const templateResponse = await fetch(`/api/templates/${visitData.templateId}`, {
            headers: {
              ...authHeader
            }
          });
          
          if (templateResponse.ok) {
            const templateData = await templateResponse.json();
            console.log("Template data loaded:", templateData);
            setTemplate(templateData);
          } else {
            setError('Unable to load the assessment template');
          }
        } else {
          setError('This visit is not associated with a template');
        }
        
      } catch (error) {
        console.error('Error loading visit data:', error);
        setError('Failed to load visit data. Please try again.');
      } finally {
        setIsLoading(false);
        setLoadComplete(true);
      }
    };
    
    loadVisitData();
  }, [visitId, user]);
  
  // Check for showPlan query parameter and automatically show plan if present
  // Also check for allowEdit parameter to enable editing of completed visits
  useEffect(() => {
    // Only try to show the plan after the data has loaded
    if (loadComplete && visit) {
      // Check URL for query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const showPlanParam = urlParams.get('showPlan');
      const allowEditParam = urlParams.get('allowEdit');
      
      // Handle completed visits
      if (visit.status === 'completed') {
        // If allowEdit=true is in the URL, we'll allow editing even if completed
        if (allowEditParam === 'true') {
          console.log('allowEdit parameter detected, allowing editing of completed visit');
          // We don't need to change the status here, just allow editing
        }
        // Show plan if requested and not already showing
        else if (showPlanParam === 'true' && !showPlan) {
          console.log('showPlan parameter detected, generating plan...');
          // Call the generatePlan function
          generatePlan();
        }
      }
    }
  }, [loadComplete, visit, showPlan]);
  
  // Add secondary useEffect hooks here - always include them in every render
  useEffect(() => {
    // Each time skip logic changes, update the UI accordingly
    if (template && visit) {
      setSkipChecked(true);
    }
  }, [template, visit, responses]);
  
  // Check if current section should be skipped based on skip logic
  useEffect(() => {
    if (template && template.sections && template.sections.length > 0) {
      console.log('Evaluating section skip logic for section', currentSection);
      
      // If current section should be skipped, move to next section
      if (shouldSkipSection(currentSection)) {
        console.log('Section', currentSection, 'should be skipped, moving to next section');
        goToNextSection();
      }
    }
  }, [currentSection, responses, template]);
  
  // Add debug logging for skip logic
  useEffect(() => {
    if (template && template.sections) {
      // Log which sections would be skipped based on current responses
      template.sections.forEach((section, index) => {
        const shouldSkip = shouldSkipSection(index);
        if (shouldSkip) {
          console.log(`Section ${index} (${section.title}) would be skipped based on current responses`);
        }
      });
    }
  }, [responses, template]);
  
  // Update a response for a question
  const handleResponseChange = (questionId: string, value: any) => {
    console.log(`Response changed for question ${questionId}:`, value);
    
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear validation error if one exists
    if (validationErrors[questionId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
    
    // Log that we're going to re-evaluate skip logic
    console.log('Re-evaluating skip logic after response change');
  };
  
  // Validate the current section before proceeding
  const validateCurrentSection = (): boolean => {
    if (!template || !template.sections || !template.sections[currentSection]) {
      return true;
    }
    
    const currentSectionData = template.sections[currentSection];
    const requiredQuestions = currentSectionData.questions.filter(q => q.required);
    
    const newErrors: Record<string, string> = {};
    
    requiredQuestions.forEach(question => {
      const response = responses[question.id];
      
      if (response === undefined || response === null || response === '') {
        newErrors[question.id] = 'This question requires an answer';
      } else if (Array.isArray(response) && response.length === 0) {
        newErrors[question.id] = 'Please select at least one option';
      }
    });
    
    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Render a single question based on its type
  const renderQuestion = (question: Question, index: number) => {
    const hasError = validationErrors[question.id];
    
    // Check if this question should be skipped based on skip logic
    if (shouldSkipQuestion(question)) {
      return null; // Don't render this question
    }
    
    return (
      <div key={question.id} className={`mb-8 p-4 rounded-lg ${hasError ? 'bg-red-50' : 'bg-white'}`}>
        <div className="flex items-start mb-2">
          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-medium text-sm mr-2">
            {index + 1}
          </span>
          <h3 className="text-lg font-medium text-gray-900">
            {question.text}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
        </div>
        
        {hasError && (
          <div className="mt-1 mb-3 text-sm text-red-600 flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
            {validationErrors[question.id]}
          </div>
        )}
        
        <div className="mt-3">
          {renderQuestionInput(question)}
        </div>
      </div>
    );
  };
  
  // Function to check if a question should be skipped based on skip logic
  const shouldSkipQuestion = (question: Question): boolean => {
    if (!question.skipLogicRules || question.skipLogicRules.length === 0) {
      return false; // No skip logic rules, so don't skip
    }
    
    // Check each rule
    for (const rule of question.skipLogicRules) {
      // Skip section-level rules as they're handled separately
      if (rule.targetType === 'SECTION') continue;
      
      const { condition } = rule;
      const sourceQuestionId = condition.questionId;
      const sourceResponse = responses[sourceQuestionId];
      
      // Skip if the source question hasn't been answered yet
      if (sourceResponse === undefined) continue;
      
      let conditionMet = false;
      
      // Evaluate the condition
      switch (condition.operator) {
        case 'equals':
          conditionMet = sourceResponse === condition.value;
          break;
        case 'not_equals':
          conditionMet = sourceResponse !== condition.value;
          break;
        case 'contains':
          conditionMet = Array.isArray(sourceResponse) && sourceResponse.includes(condition.value);
          break;
        case 'not_contains':
          conditionMet = !Array.isArray(sourceResponse) || !sourceResponse.includes(condition.value);
          break;
        case 'greater_than':
          conditionMet = Number(sourceResponse) > Number(condition.value);
          break;
        case 'less_than':
          conditionMet = Number(sourceResponse) < Number(condition.value);
          break;
        default:
          conditionMet = false;
      }
      
      // Log the evaluation for debugging
      console.log(`Evaluating question skip logic rule:`, {
        questionId: question.id,
        questionText: question.text,
        ruleId: rule.id,
        sourceQuestionId,
        sourceResponse,
        operator: condition.operator,
        value: condition.value,
        conditionMet,
        action: rule.action
      });
      
      // Apply the rule action if condition is met
      if (conditionMet) {
        // If action is HIDE, skip this question
        if (rule.action === 'HIDE') {
          console.log(`Question "${question.text}" will be hidden due to rule ${rule.id}`);
          return true;
        }
        // If action is SHOW, don't skip this question
        else if (rule.action === 'SHOW') {
          console.log(`Question "${question.text}" will be shown due to rule ${rule.id}`);
          return false;
        }
      }
    }
    
    return false; // Default to not skipping
  };
  
  // Function to check if a section should be skipped based on skip logic
  const shouldSkipSection = (sectionIndex: number): boolean => {
    if (!template || !template.sections || !template.sections[sectionIndex]) {
      return false;
    }
    
    const section = template.sections[sectionIndex];
    
    // Check each question in the section for section-level skip logic
    for (const question of section.questions || []) {
      if (!question.skipLogicRules) continue;
      
      // Look for section-level skip logic rules
      for (const rule of question.skipLogicRules) {
        // Only process rules that target sections
        if (rule.targetType !== 'SECTION') continue;
        
        const { condition } = rule;
        const sourceQuestionId = condition.questionId;
        const sourceResponse = responses[sourceQuestionId];
        
        // Skip if the source question hasn't been answered yet
        if (sourceResponse === undefined) continue;
        
        let conditionMet = false;
        
        // Evaluate the condition
        switch (condition.operator) {
          case 'equals':
            conditionMet = sourceResponse === condition.value;
            break;
          case 'not_equals':
            conditionMet = sourceResponse !== condition.value;
            break;
          case 'contains':
            conditionMet = Array.isArray(sourceResponse) && sourceResponse.includes(condition.value);
            break;
          case 'not_contains':
            conditionMet = !Array.isArray(sourceResponse) || !sourceResponse.includes(condition.value);
            break;
          case 'greater_than':
            conditionMet = Number(sourceResponse) > Number(condition.value);
            break;
          case 'less_than':
            conditionMet = Number(sourceResponse) < Number(condition.value);
            break;
          default:
            conditionMet = false;
        }
        
        // Log the evaluation for debugging
        console.log(`Evaluating section skip logic rule:`, {
          sectionId: section.id,
          sectionTitle: section.title,
          questionId: question.id,
          ruleId: rule.id,
          sourceQuestionId,
          sourceResponse,
          operator: condition.operator,
          value: condition.value,
          conditionMet,
          action: rule.action,
          targetType: rule.targetType,
          targetSectionId: rule.targetSectionId
        });
        
        // Apply the rule action if condition is met
        if (conditionMet) {
          // If the rule targets this section and the action is HIDE, skip this section
          if (rule.targetSectionId === section.id && rule.action === 'HIDE') {
            console.log(`Section ${sectionIndex} (${section.title}) will be hidden due to rule ${rule.id}`);
            return true;
          }
          // If the rule targets this section and the action is SHOW, don't skip this section
          else if (rule.targetSectionId === section.id && rule.action === 'SHOW') {
            console.log(`Section ${sectionIndex} (${section.title}) will be shown due to rule ${rule.id}`);
            return false;
          }
        }
      }
    }
    
    return false; // Default to not skipping
  };
  
  // Modify goToNextSection to skip sections that should be hidden
  const goToNextSection = () => {
    if (!validateCurrentSection()) {
      return;
    }
    
    if (template && template.sections && currentSection < template.sections.length - 1) {
      let nextSection = currentSection + 1;
      
      // Skip any sections that should be hidden based on skip logic
      while (nextSection < template.sections.length && shouldSkipSection(nextSection)) {
        nextSection++;
      }
      
      // If we found a valid next section, go to it
      if (nextSection < template.sections.length) {
        setCurrentSection(nextSection);
        window.scrollTo(0, 0);
      } else {
        // If all remaining sections should be skipped, we're at the end
        setCurrentSection(template.sections.length - 1);
      }
    }
  };
  
  // Modify goToPreviousSection to skip sections that should be hidden
  const goToPreviousSection = () => {
    if (currentSection > 0) {
      let prevSection = currentSection - 1;
      
      // Skip any sections that should be hidden based on skip logic
      while (prevSection >= 0 && shouldSkipSection(prevSection)) {
        prevSection--;
      }
      
      // If we found a valid previous section, go to it
      if (prevSection >= 0) {
        setCurrentSection(prevSection);
        window.scrollTo(0, 0);
      } else {
        // If all previous sections should be skipped, we're at the beginning
        setCurrentSection(0);
      }
    }
  };
  
  // Handle saving responses and updating visit status
  const handleSaveVisit = async (status: 'in-progress' | 'completed') => {
    if (!visit || !visitId) {
      setError('Cannot save visit: missing visit data or ID');
      return;
    }
    
    // For completion, validate the current section first
    if (status === 'completed' && !validateCurrentSection()) {
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Get auth token
      let authHeader = {};
      const { auth } = await import('@/app/lib/firebase');
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const token = await currentUser.getIdToken();
        authHeader = {
          'Authorization': `Bearer ${token}`
        };
      }
      
      // Check URL for allowEdit parameter 
      const urlParams = new URLSearchParams(window.location.search);
      const allowEditParam = urlParams.get('allowEdit');
      
      // If we're editing a completed visit (allowEdit=true in URL),
      // keep the status as completed rather than changing to in-progress
      const effectiveStatus = 
        (visit.status === 'completed' && allowEditParam === 'true' && status === 'in-progress') 
          ? 'completed' 
          : status;
      
      console.log(`Saving visit with status: ${effectiveStatus} (original request: ${status})`);
      console.log('Visit object before update:', visit);
      
      // Create a clean version of the visit object removing any circular references
      const visitDataToSend = {
        ...visit,
        // Ensure status is formatted in lowercase for consistency
        status: effectiveStatus.toLowerCase(),
        responses: { ...responses },
        lastUpdated: new Date().toISOString()
      };
      
      // Remove potential circular references or non-serializable fields
      delete visitDataToSend._id; // Use the MongoDB ID only on the server side
      
      // Print the exact data we're sending to make debugging easier
      console.log('Sending updated visit data:', JSON.stringify(visitDataToSend, null, 2));
      
      // Save via API
      const response = await fetch(`/api/visits/${visitId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify(visitDataToSend)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(`Error updating visit: ${errorData.error || response.statusText}`);
        } catch (e) {
          throw new Error(`Error updating visit: ${response.statusText || 'Unknown error'}`);
        }
      }
      
      const savedVisit = await response.json();
      console.log('Visit successfully updated:', savedVisit);
      
      // Add additional status verification
      if (savedVisit.status?.toLowerCase() !== effectiveStatus.toLowerCase()) {
        console.warn(`Warning: Expected status ${effectiveStatus.toLowerCase()} but got ${savedVisit.status?.toLowerCase()}`);
      }
      
      // If completing the visit, redirect to visits list
      if (effectiveStatus === 'completed') {
        console.log('Visit completed, redirecting to visits page...');
        alert('Visit has been marked as completed!');
        
        try {
          // Force a brief wait to ensure the update is processed
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Redirect to dashboard-visits instead of /visits
          window.location.href = '/dashboard-visits';
        } catch (err) {
          console.error('Navigation error:', err);
          // Fallback to simple push if there's an issue
          router.push('/dashboard-visits');
        }
      } else {
        // Show a saved indicator or notification
        alert('Progress saved successfully!');
      }
      
    } catch (error: any) {
      console.error('Error saving visit:', error);
      setError(error.message || 'Failed to save visit. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Render the appropriate input for a question
  const renderQuestionInput = (question: Question) => {
    const value = responses[question.id];
    console.log("Rendering question:", question.id, "type:", question.type, "value:", value);
    
    // Normalize question type to lowercase
    const questionType = question.type?.toLowerCase();
    
    switch (questionType) {
      case 'multiple_choice':
      case 'multiplechoice':
      case 'choice':
      case 'select':
      case 'radio':
        return (
          <div className="space-y-2">
            {question.options?.map(option => (
              <div key={option.id} className="flex items-center">
                <input
                  id={`question-${question.id}-option-${option.id}`}
                  name={`question-${question.id}`}
                  type="radio"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  checked={value === option.id}
                  onChange={() => handleResponseChange(question.id, option.id)}
                />
                <label
                  htmlFor={`question-${question.id}-option-${option.id}`}
                  className="ml-3 text-sm text-gray-700"
                >
                  {option.text}
                </label>
              </div>
            ))}
          </div>
        );
      
      case 'checkboxes':
      case 'checkbox':
      case 'multiselect':
      case 'multi':
        const checkedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {question.options?.map(option => (
              <div key={option.id} className="flex items-center">
                <input
                  id={`question-${question.id}-option-${option.id}`}
                  name={`question-${question.id}-option-${option.id}`}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={checkedValues.includes(option.id)}
                  onChange={() => {
                    const newValue = checkedValues.includes(option.id)
                      ? checkedValues.filter(id => id !== option.id)
                      : [...checkedValues, option.id];
                    handleResponseChange(question.id, newValue);
                  }}
                />
                <label
                  htmlFor={`question-${question.id}-option-${option.id}`}
                  className="ml-3 text-sm text-gray-700"
                >
                  {option.text}
                </label>
              </div>
            ))}
          </div>
        );
      
      case 'text':
      case 'textarea':
      case 'string':
      case 'freetext':
      case 'free_text':
        return (
          <textarea
            id={`question-${question.id}`}
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={value || ''}
            onChange={e => handleResponseChange(question.id, e.target.value)}
          />
        );
      
      case 'number':
      case 'numeric':
      case 'integer':
        return (
          <input
            type="number"
            id={`question-${question.id}`}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={value || ''}
            onChange={e => handleResponseChange(question.id, e.target.value)}
          />
        );
      
      case 'date':
      case 'calendar':
        return (
          <input
            type="date"
            id={`question-${question.id}`}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={value || ''}
            onChange={e => handleResponseChange(question.id, e.target.value)}
          />
        );
      
      case 'yes_no':
      case 'yesno':
      case 'boolean':
      case 'yes/no':
      case 'true/false':
        return (
          <div className="flex space-x-4">
            <div className="flex items-center">
              <input
                id={`question-${question.id}-yes`}
                name={`question-${question.id}`}
                type="radio"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                checked={value === true}
                onChange={() => handleResponseChange(question.id, true)}
              />
              <label
                htmlFor={`question-${question.id}-yes`}
                className="ml-3 text-sm text-gray-700"
              >
                Yes
              </label>
            </div>
            <div className="flex items-center">
              <input
                id={`question-${question.id}-no`}
                name={`question-${question.id}`}
                type="radio"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                checked={value === false}
                onChange={() => handleResponseChange(question.id, false)}
              />
              <label
                htmlFor={`question-${question.id}-no`}
                className="ml-3 text-sm text-gray-700"
              >
                No
              </label>
            </div>
          </div>
        );
      
      case 'bmi_calculator':
      case 'bmi':
        // Load existing values or default to empty
        const bmiData = value || { height: '', weight: '', bmi: '', classification: '' };
        
        // Calculate BMI when height and weight are present
        const calculateBMI = (height: number, weight: number) => {
          // Height in inches, weight in pounds
          if (height <= 0 || weight <= 0) return { bmi: '', classification: '' };
          
          const bmi = (weight / (height * height)) * 703;
          const roundedBMI = Math.round(bmi * 10) / 10;
          
          let classification = '';
          if (bmi < 18.5) classification = 'Underweight';
          else if (bmi < 25) classification = 'Normal weight';
          else if (bmi < 30) classification = 'Overweight';
          else classification = 'Obese';
          
          return { bmi: roundedBMI.toString(), classification };
        };
        
        const updateBMIData = (field: string, value: string) => {
          const newData = { ...bmiData, [field]: value };
          
          if (newData.height && newData.weight) {
            const height = parseFloat(newData.height);
            const weight = parseFloat(newData.weight);
            
            if (!isNaN(height) && !isNaN(weight) && height > 0 && weight > 0) {
              const result = calculateBMI(height, weight);
              newData.bmi = result.bmi;
              newData.classification = result.classification;
            }
          }
          
          handleResponseChange(question.id, newData);
        };
        
        return (
          <div className="bg-white p-4 rounded-md border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">BMI Calculator</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor={`${question.id}-height`} className="block text-sm font-medium text-gray-700 mb-1">
                  Height (inches)
                </label>
                <input
                  type="number"
                  id={`${question.id}-height`}
                  value={bmiData.height}
                  onChange={e => updateBMIData('height', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter height in inches"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label htmlFor={`${question.id}-weight`} className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (pounds)
                </label>
                <input
                  type="number"
                  id={`${question.id}-weight`}
                  value={bmiData.weight}
                  onChange={e => updateBMIData('weight', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter weight in pounds"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
            
            {bmiData.bmi && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">BMI Result:</p>
                    <p className="text-xl font-bold text-blue-700">{bmiData.bmi}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Classification:</p>
                    <p className="text-xl font-bold text-blue-700">{bmiData.classification}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'vital_signs':
      case 'vitalsigns':
        // Load existing values or default to empty
        const vitalSigns = value || {
          bloodPressureSystolic: '',
          bloodPressureDiastolic: '',
          heartRate: '',
          respiratoryRate: '',
          temperature: '',
          oxygenSaturation: '',
          height: '',
          weight: '',
        };
        
        // Handle updates to vital signs
        const updateVitalSign = (field: string, value: string) => {
          handleResponseChange(question.id, {
            ...vitalSigns,
            [field]: value
          });
        };
        
        return (
          <div className="bg-white p-4 rounded-md border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Vital Signs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Pressure (mmHg)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={vitalSigns.bloodPressureSystolic}
                    onChange={e => updateVitalSign('bloodPressureSystolic', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Systolic"
                    min="0"
                  />
                  <span className="self-center">/</span>
                  <input
                    type="number"
                    value={vitalSigns.bloodPressureDiastolic}
                    onChange={e => updateVitalSign('bloodPressureDiastolic', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Diastolic"
                    min="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  value={vitalSigns.heartRate}
                  onChange={e => updateVitalSign('heartRate', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter heart rate"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Respiratory Rate (breaths/min)
                </label>
                <input
                  type="number"
                  value={vitalSigns.respiratoryRate}
                  onChange={e => updateVitalSign('respiratoryRate', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter respiratory rate"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature (°F)
                </label>
                <input
                  type="number"
                  value={vitalSigns.temperature}
                  onChange={e => updateVitalSign('temperature', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter temperature"
                  min="0"
                  step="0.1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Oxygen Saturation (%)
                </label>
                <input
                  type="number"
                  value={vitalSigns.oxygenSaturation}
                  onChange={e => updateVitalSign('oxygenSaturation', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter oxygen saturation"
                  min="0"
                  max="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (inches)
                </label>
                <input
                  type="number"
                  value={vitalSigns.height}
                  onChange={e => updateVitalSign('height', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter height"
                  min="0"
                  step="0.1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (pounds)
                </label>
                <input
                  type="number"
                  value={vitalSigns.weight}
                  onChange={e => updateVitalSign('weight', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter weight"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        );

      case 'phq9':
      case 'phq-9':
        // PHQ-9 questions array
        const phq9Questions = [
          "Little interest or pleasure in doing things",
          "Feeling down, depressed, or hopeless",
          "Trouble falling or staying asleep, or sleeping too much",
          "Feeling tired or having little energy",
          "Poor appetite or overeating",
          "Feeling bad about yourself - or that you are a failure or have let yourself or your family down",
          "Trouble concentrating on things, such as reading the newspaper or watching television",
          "Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual",
          "Thoughts that you would be better off dead, or of hurting yourself"
        ];
        
        // Options for each PHQ-9 question
        const phq9Options = [
          { value: 0, text: "Not at all" },
          { value: 1, text: "Several days" },
          { value: 2, text: "More than half the days" },
          { value: 3, text: "Nearly every day" }
        ];
        
        // Load existing answers or initialize with zeros
        const phq9Answers = value?.answers || Array(9).fill(0);
        
        // Calculate total score and determine severity
        const phq9Total = phq9Answers.reduce((sum, val) => sum + (parseInt(val) || 0), 0);
        
        let phq9Severity = "None";
        if (phq9Total >= 20) phq9Severity = "Severe depression";
        else if (phq9Total >= 15) phq9Severity = "Moderately severe depression";
        else if (phq9Total >= 10) phq9Severity = "Moderate depression";
        else if (phq9Total >= 5) phq9Severity = "Mild depression";
        else phq9Severity = "Minimal or none";
        
        // Handle answer changes
        const updatePhq9Answer = (index: number, value: number) => {
          const newAnswers = [...phq9Answers];
          newAnswers[index] = value;
          
          handleResponseChange(question.id, {
            answers: newAnswers,
            total: newAnswers.reduce((sum, val) => sum + (parseInt(val) || 0), 0)
          });
        };
        
        return (
          <div className="bg-white p-4 rounded-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">PHQ-9 Depression Screening</h3>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Score</p>
                <p className="text-xl font-bold text-blue-700">{phq9Total}/27</p>
                <p className="text-sm font-medium text-gray-700">{phq9Severity}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Over the last 2 weeks, how often have you been bothered by any of the following problems?
            </p>
            
            <div className="space-y-4">
              {phq9Questions.map((question, index) => (
                <div key={index} className="border-b border-gray-200 pb-3">
                  <p className="text-sm font-medium text-gray-800 mb-2">{index + 1}. {question}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {phq9Options.map(option => (
                      <div key={option.value} className="flex items-center">
                        <input
                          id={`phq9-q${index}-a${option.value}`}
                          type="radio"
                          name={`phq9-q${index}`}
                          value={option.value}
                          checked={parseInt(phq9Answers[index]) === option.value}
                          onChange={() => updatePhq9Answer(index, option.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <label 
                          htmlFor={`phq9-q${index}-a${option.value}`}
                          className="ml-2 text-sm text-gray-700"
                        >
                          {option.text}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'phq2':
      case 'phq-2':
        // PHQ-2 questions (first two questions of PHQ-9)
        const phq2Questions = [
          "Little interest or pleasure in doing things",
          "Feeling down, depressed, or hopeless"
        ];
        
        // Options for each PHQ-2 question
        const phq2Options = [
          { value: 0, text: "Not at all" },
          { value: 1, text: "Several days" },
          { value: 2, text: "More than half the days" },
          { value: 3, text: "Nearly every day" }
        ];
        
        // Load existing answers or initialize with zeros
        const phq2Answers = value?.answers || [0, 0];
        
        // Calculate total score
        const phq2Total = phq2Answers.reduce((sum, val) => sum + (parseInt(val) || 0), 0);
        
        // Determine if further evaluation is needed (score ≥ 3 suggests depression)
        const phq2Result = phq2Total >= 3 ? "Positive screen - further evaluation recommended" : "Negative screen";
        
        // Handle answer changes
        const updatePhq2Answer = (index: number, value: number) => {
          const newAnswers = [...phq2Answers];
          newAnswers[index] = value;
          
          handleResponseChange(question.id, {
            answers: newAnswers,
            total: newAnswers.reduce((sum, val) => sum + (parseInt(val) || 0), 0)
          });
        };
        
        return (
          <div className="bg-white p-4 rounded-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">PHQ-2 Depression Screening</h3>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Score</p>
                <p className="text-xl font-bold text-blue-700">{phq2Total}/6</p>
                <p className="text-sm font-medium text-gray-700">{phq2Result}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Over the last 2 weeks, how often have you been bothered by any of the following problems?
            </p>
            
            <div className="space-y-4">
              {phq2Questions.map((question, index) => (
                <div key={index} className="border-b border-gray-200 pb-3">
                  <p className="text-sm font-medium text-gray-800 mb-2">{index + 1}. {question}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {phq2Options.map(option => (
                      <div key={option.value} className="flex items-center">
                        <input
                          id={`phq2-q${index}-a${option.value}`}
                          type="radio"
                          name={`phq2-q${index}`}
                          value={option.value}
                          checked={parseInt(phq2Answers[index]) === option.value}
                          onChange={() => updatePhq2Answer(index, option.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <label 
                          htmlFor={`phq2-q${index}-a${option.value}`}
                          className="ml-2 text-sm text-gray-700"
                        >
                          {option.text}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'mmse':
      case 'mini-mental':
        // MMSE domains and their point values
        const mmseCategories = [
          { name: "Orientation to Time", maxPoints: 5 },
          { name: "Orientation to Place", maxPoints: 5 },
          { name: "Registration", maxPoints: 3 },
          { name: "Attention and Calculation", maxPoints: 5 },
          { name: "Recall", maxPoints: 3 },
          { name: "Language", maxPoints: 8 },
          { name: "Visual Construction", maxPoints: 1 }
        ];
        
        // Load existing scores or initialize with zeros
        const mmseScores = value?.scores || mmseCategories.map(c => 0);
        
        // Calculate total score
        const mmseTotal = mmseScores.reduce((sum, val) => sum + (parseInt(val) || 0), 0);
        
        // Determine cognitive impairment level
        let mmseInterpretation = "";
        if (mmseTotal >= 24) mmseInterpretation = "Normal cognition";
        else if (mmseTotal >= 19) mmseInterpretation = "Mild cognitive impairment";
        else if (mmseTotal >= 10) mmseInterpretation = "Moderate cognitive impairment";
        else mmseInterpretation = "Severe cognitive impairment";
        
        // Handle score changes
        const updateMmseScore = (index: number, value: number) => {
          const category = mmseCategories[index];
          // Ensure score doesn't exceed max points for category
          value = Math.min(value, category.maxPoints);
          
          const newScores = [...mmseScores];
          newScores[index] = value;
          
          handleResponseChange(question.id, {
            scores: newScores,
            total: newScores.reduce((sum, val) => sum + (parseInt(val) || 0), 0)
          });
        };
        
        return (
          <div className="bg-white p-4 rounded-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Mini-Mental State Examination (MMSE)</h3>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Score</p>
                <p className="text-xl font-bold text-blue-700">{mmseTotal}/30</p>
                <p className="text-sm font-medium text-gray-700">{mmseInterpretation}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {mmseCategories.map((category, index) => (
                <div key={index} className="border-b border-gray-200 pb-3">
                  <div className="flex justify-between mb-2">
                    <p className="text-sm font-medium text-gray-800">{category.name}</p>
                    <p className="text-sm text-gray-500">Max: {category.maxPoints} points</p>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0"
                      max={category.maxPoints}
                      value={mmseScores[index] || 0}
                      onChange={e => updateMmseScore(index, parseInt(e.target.value) || 0)}
                      className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <div className="ml-3 flex">
                      {[...Array(category.maxPoints)].map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => updateMmseScore(index, i + 1)}
                          className={`h-8 w-8 rounded-full mx-1 focus:outline-none ${
                            (mmseScores[index] || 0) > i 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'scoring_scale':
      case 'scoringscale':
        // For generic scoring scales, we display a set of options with numbers
        // This is a simplified version - in a real app, this would be configured in the template
        const scaleOptions = question.options || [
          { id: '0', text: '0 - None', value: '0' },
          { id: '1', text: '1 - Mild', value: '1' },
          { id: '2', text: '2 - Moderate', value: '2' },
          { id: '3', text: '3 - Severe', value: '3' }
        ];
        
        return (
          <div className="bg-white p-4 rounded-md border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Scoring Scale</h3>
            <div className="space-y-2">
              {scaleOptions.map(option => (
                <div key={option.id} className="flex items-center">
                  <input
                    id={`question-${question.id}-option-${option.id}`}
                    name={`question-${question.id}`}
                    type="radio"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    checked={value === option.id}
                    onChange={() => handleResponseChange(question.id, option.id)}
                  />
                  <label
                    htmlFor={`question-${question.id}-option-${option.id}`}
                    className="ml-3 text-sm text-gray-700"
                  >
                    {option.text}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        // If there are options, default to multiple choice
        if (question.options && question.options.length > 0) {
          return (
            <div className="space-y-2">
              {question.options.map(option => (
                <div key={option.id} className="flex items-center">
                  <input
                    id={`question-${question.id}-option-${option.id}`}
                    name={`question-${question.id}`}
                    type="radio"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    checked={value === option.id}
                    onChange={() => handleResponseChange(question.id, option.id)}
                  />
                  <label
                    htmlFor={`question-${question.id}-option-${option.id}`}
                    className="ml-3 text-sm text-gray-700"
                  >
                    {option.text}
                  </label>
                </div>
              ))}
            </div>
          );
        }
        
        // Default to text input if no better match
        console.warn(`Unknown question type: ${question.type} for question ID: ${question.id}`, question);
        return (
          <div>
            <p className="text-amber-600 mb-2">Warning: Unrecognized question type "{question.type}" - using text input as fallback</p>
            <textarea
              id={`question-${question.id}`}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={value || ''}
              onChange={e => handleResponseChange(question.id, e.target.value)}
            />
          </div>
        );
    }
  };
  
  // Add function to extract recommendations from responses
  const extractRecommendationsFromResponses = (responses: Record<string, any>): RecommendationItem[] => {
    if (!responses) {
      return getDefaultRecommendations();
    }
    
    const extractedRecs: RecommendationItem[] = [];
    const processedTexts = new Set<string>();
    
    // Helper to check if text is recommendation-like
    const isRecommendationLike = (text: string): boolean => {
      const lowerText = text.toLowerCase();
      const phrases = [
        'recommend', 'should', 'advised', 'suggest', 'consider', 'try', 
        'increase', 'decrease', 'reduce', 'avoid', 'limit', 'follow up',
        'schedule', 'consult', 'visit', 'appointment', 'check', 'monitor'
      ];
      return phrases.some(phrase => lowerText.includes(phrase));
    };
    
    // Determine category from text
    const getCategoryFromText = (text: string): string => {
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('exercise') || lowerText.includes('physical activity')) {
        return 'Exercise';
      }
      if (lowerText.includes('diet') || lowerText.includes('nutrition')) {
        return 'Nutrition';
      }
      if (lowerText.includes('follow up') || lowerText.includes('appointment')) {
        return 'Follow-up';
      }
      if (lowerText.includes('medication')) {
        return 'Medication';
      }
      return 'Lifestyle';
    };
    
    // Process each response to look for recommendations
    Object.entries(responses).forEach(([questionId, response]) => {
      if (!response) return;
      
      // Check for recommendations in the response
      if (response.recommendations && Array.isArray(response.recommendations)) {
        response.recommendations.forEach((rec: any, index: number) => {
          if (rec && rec.text && typeof rec.text === 'string') {
            const text = rec.text.trim();
            if (text && !processedTexts.has(text)) {
              processedTexts.add(text);
              extractedRecs.push({
                id: `template-${questionId}-${index}`,
                text,
                category: rec.category || getCategoryFromText(text),
                source: `From template question: ${questionId}`,
                selected: true
              });
            }
          }
        });
      }
      
      // Check for selected answers with recommendations
      if (response.selectedAnswers && Array.isArray(response.selectedAnswers)) {
        response.selectedAnswers.forEach((answer: any, answerIndex: number) => {
          if (answer && answer.recommendations && Array.isArray(answer.recommendations)) {
            answer.recommendations.forEach((rec: any, recIndex: number) => {
              if (rec && rec.text && typeof rec.text === 'string') {
                const text = rec.text.trim();
                if (text && !processedTexts.has(text)) {
                  processedTexts.add(text);
                  extractedRecs.push({
                    id: `answer-${questionId}-${answerIndex}-${recIndex}`,
                    text,
                    category: rec.category || getCategoryFromText(text),
                    source: `From selected answer in question: ${questionId}`,
                    selected: true
                  });
                }
              }
            });
          }
        });
      }

      // NEW: Extract recommendations from selected option in template
      if (template && template.sections) {
        // Find the question in the template
        let targetQuestion: Question | undefined;
        for (const section of template.sections) {
          if (!section.questions) continue;
          
          const matchingQuestion = section.questions.find(q => q.id === questionId);
          if (matchingQuestion) {
            targetQuestion = matchingQuestion;
            break;
          }
        }

        // If question found and has options with recommendations
        if (targetQuestion && targetQuestion.options) {
          // For single option selection (string response)
          if (typeof response === 'string') {
            const selectedOption = targetQuestion.options.find(opt => opt.id === response);
            if (selectedOption && 'recommendations' in selectedOption && Array.isArray(selectedOption.recommendations)) {
              selectedOption.recommendations.forEach((rec: any, recIndex: number) => {
                if (rec && rec.text && typeof rec.text === 'string') {
                  const text = rec.text.trim();
                  if (text && !processedTexts.has(text)) {
                    processedTexts.add(text);
                    extractedRecs.push({
                      id: `option-${questionId}-${response}-${recIndex}`,
                      text,
                      category: rec.category || getCategoryFromText(text),
                      source: `From selected option: ${selectedOption.text}`,
                      selected: true
                    });
                  }
                }
              });
            }
          }
          
          // For multiple option selection (array response)
          if (Array.isArray(response)) {
            response.forEach((optionId: string) => {
              const selectedOption = targetQuestion?.options?.find(opt => opt.id === optionId);
              if (selectedOption && 'recommendations' in selectedOption && Array.isArray(selectedOption.recommendations)) {
                selectedOption.recommendations.forEach((rec: any, recIndex: number) => {
                  if (rec && rec.text && typeof rec.text === 'string') {
                    const text = rec.text.trim();
                    if (text && !processedTexts.has(text)) {
                      processedTexts.add(text);
                      extractedRecs.push({
                        id: `option-${questionId}-${optionId}-${recIndex}`,
                        text,
                        category: rec.category || getCategoryFromText(text),
                        source: `From selected option: ${selectedOption.text}`,
                        selected: true
                      });
                    }
                  }
                });
              }
            });
          }
        }
      }
      
      // Check selected options and text responses
      if (typeof response === 'object') {
        // Process answers
        if (response.text && typeof response.text === 'string' && isRecommendationLike(response.text)) {
          const text = response.text.trim();
          if (text && !processedTexts.has(text)) {
            processedTexts.add(text);
            extractedRecs.push({
              id: `text-${questionId}`,
              text,
              category: getCategoryFromText(text),
              source: `From text response to question: ${questionId}`,
              selected: true
            });
          }
        }
      }
    });
    
    // Log the number of recommendations found
    console.log(`Extracted ${extractedRecs.length} recommendations from responses`);
    
    return extractedRecs.length > 0 ? extractedRecs : getDefaultRecommendations();
  };
  
  // Default recommendations if none found
  const getDefaultRecommendations = (): RecommendationItem[] => {
    return [
      {
        id: 'default-1',
        text: 'Schedule a follow-up appointment with your primary care provider',
        category: 'Follow-up',
        source: 'Default recommendation',
        selected: true
      },
      {
        id: 'default-2',
        text: 'Maintain a balanced diet rich in fruits, vegetables, and whole grains',
        category: 'Nutrition',
        source: 'Default recommendation',
        selected: true
      },
      {
        id: 'default-3',
        text: 'Aim for at least 150 minutes of moderate physical activity each week',
        category: 'Exercise',
        source: 'Default recommendation',
        selected: true
      }
    ];
  };
  
  // Add function to generate plan
  const generatePlan = async () => {
    try {
      setGeneratingPlan(true);
      
      // Get auth token for API request
      let authHeader = {};
      try {
        const { auth } = await import('@/app/lib/firebase');
        const currentUser = auth.currentUser;
        if (currentUser) {
          const token = await currentUser.getIdToken();
          authHeader = {
            'Authorization': `Bearer ${token}`
          };
        }
      } catch (error) {
        console.error("Error getting auth token:", error);
      }
      
      try {
        console.log("Attempting to fetch recommendations from API...");
        // Try to call the server API to get recommendations
        const response = await fetch(`/api/visits/${visitId}/recommendations`, {
          headers: {
            ...authHeader
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error fetching recommendations: ${response.status}`);
        }
        
        const recommendationData = await response.json();
        console.log(`Received ${recommendationData.length} recommendations from API`);
        
        // Set the recommendations to state
        setRecommendations(recommendationData);
      } catch (error) {
        console.warn('API not available or error occurred, using local extraction:', error);
        
        // If API fails, use local extraction
        console.log("Extracting recommendations from responses:", responses);
        const extractedRecs = extractRecommendationsFromResponses(responses);
        
        // Log information about each extracted recommendation for debugging
        console.log("Extracted recommendations by category:");
        const recsByCategory = extractedRecs.reduce((groups: Record<string, any[]>, rec) => {
          const category = rec.category || 'Uncategorized';
          if (!groups[category]) groups[category] = [];
          groups[category].push(rec);
          return groups;
        }, {});
        
        Object.entries(recsByCategory).forEach(([category, recs]) => {
          console.log(`${category}: ${recs.length} recommendations`);
          recs.forEach(rec => console.log(`  - ${rec.text} (${rec.source})`));
        });
        
        setRecommendations(extractedRecs);
      }
      
      // Show the plan regardless of how we got the recommendations
      setShowPlan(true);
    } catch (error) {
      console.error('Error generating plan:', error);
      alert('Error generating plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  };
  
  // Add function to print plan
  const handlePrintPlan = () => {
    window.print();
  };
  
  // Add function to save health plan as PDF
  const handleSaveHealthPlanPdf = async () => {
    if (!visitId) return;
    
    try {
      setGeneratingPlan(true);
      
      // Get auth token
      let authHeader = {};
      const { auth } = await import('@/app/lib/firebase');
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const token = await currentUser.getIdToken();
        authHeader = {
          'Authorization': `Bearer ${token}`
        };
      }
      
      // Create a simplified plan data structure with just recommendations
      const planData = {
        recommendations: recommendations,
        createdAt: new Date().toISOString()
      };
      
      // Generate PDF with just the health plan
      console.log("Generating health plan PDF...");
      const pdfResponse = await fetch('/api/visits/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          visitId: visitId,
          planData: planData,
          visitData: visit,
          healthPlanOnly: true // Flag to include only health plan in PDF
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
      a.download = `Health_Plan_${visitId}.pdf`;
      a.click();
      
      // Clean up
      URL.revokeObjectURL(pdfUrl);
      
      console.log('Health plan saved as PDF successfully');
      
    } catch (error: any) {
      console.error("Error saving health plan as PDF:", error);
      alert(`Failed to save health plan as PDF: ${error.message}`);
    } finally {
      setGeneratingPlan(false);
    }
  };
  
  // Group recommendations by category
  const groupRecommendationsByCategory = () => {
    return recommendations.reduce((groups: Record<string, RecommendationItem[]>, rec) => {
      const category = rec.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(rec);
      return groups;
    }, {});
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error || !visit || !template) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg p-6 max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error || 'Unable to load the visit or template'}</p>
          <Link
            href="/visits"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Visits
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard-visits"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Visits
        </Link>
        
        <h1 className="text-2xl font-bold text-gray-900">
          Assessment: {visit.patientName}
        </h1>
        <p className="text-gray-600">
          Template: {template.name} • 
          {sections.length > 0 ? ` Section ${currentSection + 1} of ${sections.length}` : ' No sections'}
        </p>
      </div>
      
      {/* Progress bar */}
      <div className="mb-6 bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-blue-600 h-2.5 rounded-full" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      {/* Assessment Form */}
      <div className="bg-gray-50 shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentSectionData.title || 'Section'}
          </h2>
          
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => handleSaveVisit('in-progress')}
              disabled={saving}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Progress
            </button>
            {currentSection === sections.length - 1 && (
              <button
                type="button"
                onClick={() => handleSaveVisit('completed')}
                disabled={saving}
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Complete Assessment
              </button>
            )}
          </div>
        </div>
        
        {currentSectionData.description && (
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-md">
            <div className="flex">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-400 mr-2" />
              <p className="text-sm text-blue-700">{currentSectionData.description}</p>
            </div>
          </div>
        )}
        
        {/* Section Questions */}
        <div className="space-y-6">
          {currentSectionData.questions && currentSectionData.questions.length > 0 ? (
            currentSectionData.questions.map((question, idx) => renderQuestion(question, idx))
          ) : (
            <p className="text-gray-500 italic text-center py-8">
              No questions in this section
            </p>
          )}
        </div>
        
        {/* Navigation buttons */}
        <div className="mt-8 pt-5 flex justify-between items-center border-t border-gray-200">
          <button
            type="button"
            onClick={goToPreviousSection}
            disabled={currentSection === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous Section
          </button>
          
          {currentSection < sections.length - 1 && (
            <button
              type="button"
              onClick={goToNextSection}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Next Section
              <ChevronRightIcon className="ml-1 h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Patient Details */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Patient Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Name</h3>
            <p className="text-md">{visit.patientName}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Visit Date</h3>
            <p className="text-md">{new Date(visit.date).toLocaleDateString()}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Provider</h3>
            <p className="text-md">{visit.provider}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Duration</h3>
            <p className="text-md">{visit.duration} minutes</p>
          </div>
        </div>
      </div>
      
      {/* Personalized Health Plan Section */}
      {!showPlan && currentSection === sections.length - 1 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={generatePlan}
            disabled={generatingPlan}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {generatingPlan ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Plan...
              </>
            ) : (
              <>
                Generate Personalized Health Plan
              </>
            )}
          </button>
        </div>
      )}
      
      {showPlan && (
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6 print:shadow-none">
          <div className="flex justify-between items-center mb-6 print:hidden">
            <h2 className="text-2xl font-bold text-gray-900">Personalized Health Plan</h2>
            <div className="flex space-x-3">
              <button
                onClick={handlePrintPlan}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print Plan
              </button>
              <button
                onClick={handleSaveHealthPlanPdf}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Save Plan PDF
              </button>
              <button
                onClick={() => handleSaveVisit('completed')}
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Complete Visit
              </button>
              <button
                onClick={() => setShowPlan(false)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Back
              </button>
            </div>
          </div>
          
          {/* Print title (only visible when printing) */}
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Personalized Health Plan</h1>
            <p className="text-sm text-gray-500 mt-1">Generated on {new Date().toLocaleDateString()}</p>
          </div>
          
          {/* Plan content */}
          <div className="bg-white rounded-lg overflow-hidden print:border print:border-gray-200">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 print:bg-white">
              <h3 className="text-xl font-semibold text-blue-900">Your Recommended Health Actions</h3>
              <p className="text-blue-700 text-sm mt-1">
                These recommendations are based on the information you provided during your visit.
              </p>
            </div>
            
            <div className="p-6">
              {Object.entries(groupRecommendationsByCategory()).map(([category, recs]) => (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b">
                    {category}
                  </h3>
                  <ul className="space-y-3">
                    {recs.map(rec => (
                      <li key={rec.id} className="pl-5 text-gray-700">{rec.text}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          
          {/* Plan footer (only visible when printing) */}
          <div className="mt-8 border-t pt-6 text-sm text-gray-500 hidden print:block">
            <p>This health plan was generated based on your Annual Wellness Visit assessment.</p>
            <p>Please follow up with your healthcare provider if you have any questions or concerns.</p>
          </div>
        </div>
      )}
    </div>
  );
} 