'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import TemplateBuilder, { Template } from '../../../components/TemplateBuilder/TemplateBuilder';
import { createTemplate } from '@/app/lib/server-actions';
import { useAuth } from '@/app/contexts/AuthContext';

export default function NewTemplatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveTemplate = async (template: Template) => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Validate template has required fields
      if (!template.name.trim()) {
        throw new Error('Template name is required');
      }
      
      if (!template.sections || template.sections.length === 0) {
        throw new Error('Template must have at least one section');
      }
      
      // Log template data for debugging
      console.log('Saving template:', JSON.stringify(template, null, 2));
      
      // Save the template using server actions
      const savedTemplate = await createTemplate(template, user?.uid);
      console.log('Template saved successfully:', savedTemplate);
      
      // Simulate a slight delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Redirect to the templates list page after saving
      router.push('/templates');
    } catch (error) {
      console.error('Error saving template:', error);
      setError(error instanceof Error ? error.message : 'Unknown error saving template');
      setIsSaving(false); // Allow the user to try again
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Template</h1>
        <p className="mt-1 text-sm text-gray-500">
          Build a custom AWV template with sections, questions, recommendations, and skip logic
        </p>
        <div className="mt-4 p-4 bg-green-50 border border-green-300 rounded-md">
          <p className="text-sm text-green-800">
            The template builder has been restored with all features: 
            <span className="font-medium"> sections, recommendation texts, skip logic, and advanced question types!</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-md">
          <p className="text-sm text-red-800">
            <span className="font-medium">Error: </span>{error}
          </p>
        </div>
      )}

      {isSaving ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="spinner mb-4 h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-700">Saving your template...</p>
          </div>
        </div>
      ) : (
        <TemplateBuilder onSave={handleSaveTemplate} />
      )}
    </div>
  );
} 