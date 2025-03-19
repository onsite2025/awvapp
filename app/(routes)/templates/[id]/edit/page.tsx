'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { fetchTemplateById, modifyTemplate } from '@/app/lib/server-actions';
import TemplateBuilder, { Template } from '../../../../components/TemplateBuilder/TemplateBuilder';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';

type PageParams = {
  id: string;
};

export default function EditTemplatePage({ params }: { params: PageParams }) {
  const router = useRouter();
  // In Next.js 14, we should use React.use() to unwrap params
  // But there are often typing issues with this approach
  // For now, we'll continue to use direct access which still works
  // TODO: Update this when we upgrade to a stable Next.js 14 release
  const id = params.id;
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load template data on component mount
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const fetchedTemplate = await fetchTemplateById(id);
        if (fetchedTemplate) {
          // Make sure we're getting a plain object from the API
          // This avoids "Objects with toJSON methods are not supported" error
          const safeTemplate = JSON.parse(JSON.stringify(fetchedTemplate));
          setTemplate(safeTemplate as Template);
        } else {
          setError('Template not found');
        }
      } catch (err) {
        console.error('Error fetching template:', err);
        setError('Error loading template data');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchTemplate();
    }
  }, [id, user]);

  const handleSaveTemplate = async (updatedTemplate: Template) => {
    try {
      setIsSaving(true);
      // Ensure the ID is preserved
      updatedTemplate.id = id;
      
      // Save the updated template using the server action
      const savedTemplate = await modifyTemplate(id, updatedTemplate);
      console.log('Template updated:', savedTemplate);
      
      // Simulate a slight delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect back to the templates list
      router.push('/templates');
    } catch (error) {
      console.error('Error updating template:', error);
      alert('There was an error updating the template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/templates"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Templates
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit Template: {template.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Update your template structure, questions, and recommendations
          </p>
        </div>
      </div>

      {isSaving ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="spinner mb-4 h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-700">Saving your template...</p>
          </div>
        </div>
      ) : (
        <TemplateBuilder initialTemplate={template} onSave={handleSaveTemplate} />
      )}
    </div>
  );
} 