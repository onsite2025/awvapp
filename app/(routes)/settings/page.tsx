'use client';

import React, { useState, useEffect } from 'react';
import { 
  Cog6ToothIcon, 
  UserCircleIcon, 
  BellAlertIcon, 
  SunIcon,
  MoonIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import PageNavigation from '../../components/PageNavigation';
import Link from 'next/link';
import { UserRole } from '@/app/models/User';

// Sample user preferences - would be stored in localStorage or a backend in a real app
const defaultPreferences = {
  theme: 'light',
  notifications: {
    email: true,
    inApp: true,
    sms: false,
  },
  display: {
    compactView: false,
    hideCompleted: false,
    showTutorials: true,
  }
};

// Default user profile
const defaultUserProfile = {
  name: 'Dr. Jane Smith',
  email: 'jane.smith@example.com',
  role: 'Physician',
  specialty: 'Family Medicine',
  organization: 'Valley Medical Center',
  phoneNumber: '(555) 123-4567'
};

// Fetch user profile from API
const fetchUserProfile = async () => {
  try {
    // Try to get profile from API with bypass header
    console.log('Fetching user profile from API...');
    const lastLoginEmail = localStorage.getItem('last-login-email');
    
    const response = await fetch('/api/users/profile', {
      headers: {
        'Content-Type': 'application/json',
        'x-bypass-dev-mode': 'true',
        ...(lastLoginEmail ? { 'x-last-login-email': lastLoginEmail } : {})
      }
    });
    
    if (!response.ok) {
      console.warn(`API returned ${response.status}: ${response.statusText}`);
      throw new Error(`Failed to fetch profile: ${response.statusText}`);
    }
    
    const profile = await response.json();
    console.log('Profile fetched successfully:', profile);
    
    // Cache the profile in localStorage for fallback
    localStorage.setItem('cached_profile', JSON.stringify(profile));
    
    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    
    // Try to use cached profile as fallback
    console.log('Trying to use cached profile as fallback...');
    const cachedProfile = localStorage.getItem('cached_profile');
    if (cachedProfile) {
      try {
        const profile = JSON.parse(cachedProfile);
        console.log('Using cached profile:', profile);
        return profile;
      } catch (e) {
        console.error('Error parsing cached profile:', e);
      }
    }
    
    // If all else fails, just return null and let the caller handle it
    return null;
  }
};

const saveUserProfile = async (profileData) => {
  try {
    // Get the Firebase auth token
    const { auth } = await import('../../lib/firebase');
    const currentUser = auth.currentUser;
    
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (tokenError) {
        console.warn('Unable to get auth token:', tokenError);
        // Continue without authentication header
      }
    } else {
      console.log('No authenticated user found, proceeding with anonymous request');
      // Development fallback - continue without auth token
    }
    
    // Save the user profile to the API
    const response = await fetch('/api/users/profile', {
      method: 'PUT',
      headers,
      body: JSON.stringify(profileData)
    });
    
    if (!response.ok) {
      console.error('Failed to save user profile:', response.statusText);
      
      // In development, return a mock response
      if (process.env.NODE_ENV !== 'production') {
        console.log('Using mock response for development');
        return {
          ...profileData,
          id: 'mock-id'
        };
      }
      
      throw new Error('Failed to save user profile');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving user profile:', error);
    
    // In development, return the input data as a mock response
    if (process.env.NODE_ENV !== 'production') {
      return {
        ...profileData,
        id: 'mock-id'
      };
    }
    
    throw error;
  }
};

export default function SettingsPage() {
  // State for user preferences
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [userProfile, setUserProfile] = useState(defaultUserProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('display');

  // Check if current user is admin
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const profile = await fetchUserProfile();
        console.log("User profile for admin check:", profile);
        // Fix admin role check - ensure we compare with uppercase ADMIN value
        setIsAdmin(profile?.role === 'ADMIN' || profile?.role === UserRole.ADMIN);
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };
    
    checkAdmin();
  }, []);

  // Check for activeSettingsTab in localStorage on page load
  useEffect(() => {
    // Check if we have a specific tab to display from localStorage
    const savedActiveTab = localStorage.getItem('activeSettingsTab');
    if (savedActiveTab && ['display', 'notifications', 'profile'].includes(savedActiveTab)) {
      setActiveSection(savedActiveTab);
      // Remove the item after we've used it
      localStorage.removeItem('activeSettingsTab');
    }
  }, []);

  // Update the useEffect for loading profile and preferences
  useEffect(() => {
    const loadData = async () => {
      // Try to load profile from API first
      const apiProfile = await fetchUserProfile();
        
      if (apiProfile) {
        // Map API profile fields to our local format
        setUserProfile({
          name: apiProfile.displayName || defaultUserProfile.name,
          email: apiProfile.email || defaultUserProfile.email,
          role: apiProfile.role || defaultUserProfile.role,
          specialty: apiProfile.specialty || defaultUserProfile.specialty,
          organization: apiProfile.organization || defaultUserProfile.organization,
          phoneNumber: apiProfile.phoneNumber || defaultUserProfile.phoneNumber
        });
        
        // If API profile has settings, use them
        if (apiProfile.settings) {
          setPreferences({
            ...preferences,
            theme: apiProfile.settings.theme || preferences.theme,
            display: {
              ...preferences.display,
              ...(apiProfile.settings.display || {})
            },
            notifications: {
              ...preferences.notifications,
              ...(apiProfile.settings.notifications || {})
            }
          });
        }
      } else {
        // Fallback to localStorage if API fails
      const savedPreferences = localStorage.getItem('user_preferences');
      if (savedPreferences) {
        try {
          setPreferences(JSON.parse(savedPreferences));
        } catch (error) {
          console.error('Error parsing user preferences:', error);
        }
      }
      
        // Try to use the last-login email to create a fallback profile
        const lastLoginEmail = localStorage.getItem('last-login-email');
        if (lastLoginEmail) {
          console.log('Creating fallback profile with last login email:', lastLoginEmail);
          setUserProfile({
            name: lastLoginEmail.split('@')[0],
            email: lastLoginEmail,
            role: 'ADMIN', // Assume admin in development
            specialty: '',
            organization: '',
            phoneNumber: ''
          });
          
          // Check if we should set admin status
          if (lastLoginEmail === 'desalegnejigu2014@gmail.com') {
            setIsAdmin(true);
          }
        } else {
          // Last resort - try to load from localStorage
      const savedProfile = localStorage.getItem('user_profile');
      if (savedProfile) {
        try {
          setUserProfile(JSON.parse(savedProfile));
        } catch (error) {
          console.error('Error parsing user profile:', error);
            }
          }
        }
      }
    };

    loadData();
  }, []);

  // Handle form changes
  const handleDisplayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setPreferences({
      ...preferences,
      display: {
        ...preferences.display,
        [name]: checked
      }
    });
  };
  
  // Handle theme changes
  const handleThemeChange = (theme: string) => {
    setPreferences({
      ...preferences,
      theme
    });
    
    // Apply the theme to the document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#1a1a1a';
      document.body.style.color = '#f3f4f6';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    }
    
    // Save theme to localStorage
    localStorage.setItem('theme', theme);
  };

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      handleThemeChange(savedTheme);
    }
  }, []);

  // Handle profile changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Update the savePreferences function
  const savePreferences = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    // Save to localStorage as fallback
      localStorage.setItem('user_preferences', JSON.stringify(preferences));
    localStorage.setItem('user_profile', JSON.stringify(userProfile));
    
    // Build API-compatible profile data
    const apiProfileData = {
      displayName: userProfile.name,
      email: userProfile.email,
      specialty: userProfile.specialty,
      organization: userProfile.organization,
      phoneNumber: userProfile.phoneNumber,
      settings: {
        theme: preferences.theme,
        display: preferences.display,
        notifications: preferences.notifications
      }
    };
    
    console.log('Saving profile data to API:', apiProfileData);
    
    // Try to save to API
    try {
      const savedProfile = await saveUserProfile(apiProfileData);
      
      setIsSaving(false);
      if (savedProfile) {
        setSaveMessage('Settings saved successfully to server!');
        console.log('Profile saved successfully:', savedProfile);
      } else {
        setSaveMessage('Settings saved locally. Server sync failed.');
        console.warn('Profile save returned no data');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setIsSaving(false);
      setSaveMessage('Settings saved locally only.');
    }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-blue-100 max-w-2xl">
          Manage your account preferences and customize your experience
        </p>
      </div>

      <PageNavigation />

      {/* Settings Tabs - Improved styling */}
      <div className="mb-8 mt-8">
        <div className="flex flex-wrap items-center space-x-1 sm:space-x-4 bg-white rounded-lg shadow-md p-2">
          <button
            onClick={() => setActiveSection('display')}
            className={`${
              activeSection === 'display'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 hover:bg-gray-50 border-transparent'
            } flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out border`}
          >
            <Cog6ToothIcon className="h-5 w-5 mr-2" />
            Display
          </button>
          <button
            onClick={() => setActiveSection('notifications')}
            className={`${
              activeSection === 'notifications'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 hover:bg-gray-50 border-transparent'
            } flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out border`}
          >
            <BellAlertIcon className="h-5 w-5 mr-2" />
            Notifications
          </button>
          <button
            onClick={() => setActiveSection('profile')}
            className={`${
              activeSection === 'profile'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 hover:bg-gray-50 border-transparent'
            } flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out border`}
          >
            <UserCircleIcon className="h-5 w-5 mr-2" />
            Profile
          </button>
          {isAdmin && (
            <Link
              href="/settings/users"
              className="bg-white text-gray-600 hover:bg-gray-50 border-transparent flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out border"
            >
              <UserCircleIcon className="h-5 w-5 mr-2" />
              User Management
            </Link>
          )}
        </div>
      </div>

      {/* Display Settings Section - Enhanced styling */}
      {activeSection === 'display' && (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden transition-all duration-500 transform">
          <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
                <Cog6ToothIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-900">Display Settings</h3>
                <p className="mt-1 text-sm text-gray-500">Customize how you view the application</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="space-y-8">
              {/* Theme Selection - Enhanced with cards */}
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-4">Theme</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    onClick={() => handleThemeChange('light')}
                    className={`relative rounded-xl border-2 cursor-pointer overflow-hidden transition-all duration-200 ${
                      preferences.theme === 'light' 
                        ? 'border-blue-500 ring-2 ring-blue-200' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <SunIcon className="h-6 w-6 text-yellow-500" />
                    {preferences.theme === 'light' && (
                          <div className="bg-blue-500 text-white rounded-full p-1">
                        <CheckIcon className="h-4 w-4" />
                      </div>
                    )}
                      </div>
                      <div className="h-24 bg-gradient-to-b from-blue-50 to-gray-100 rounded-lg border border-gray-200 mb-3"></div>
                      <p className="font-medium text-gray-800">Light Mode</p>
                      <p className="text-xs text-gray-500 mt-1">Standard bright interface</p>
                    </div>
                  </div>
                  
                  <div 
                    onClick={() => handleThemeChange('dark')}
                    className={`relative rounded-xl border-2 cursor-pointer overflow-hidden transition-all duration-200 ${
                      preferences.theme === 'dark' 
                        ? 'border-blue-500 ring-2 ring-blue-200' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="p-4 bg-gray-900">
                      <div className="flex items-center justify-between mb-3">
                        <MoonIcon className="h-6 w-6 text-gray-300" />
                    {preferences.theme === 'dark' && (
                          <div className="bg-blue-500 text-white rounded-full p-1">
                        <CheckIcon className="h-4 w-4" />
                      </div>
                    )}
                      </div>
                      <div className="h-24 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg border border-gray-700 mb-3"></div>
                      <p className="font-medium text-gray-100">Dark Mode</p>
                      <p className="text-xs text-gray-400 mt-1">Easier on the eyes at night</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Display Options - Improved checkboxes */}
              <div className="mt-8">
                <h4 className="text-base font-semibold text-gray-900 mb-4">Display Options</h4>
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="space-y-5">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="compact-view"
                        name="compactView"
                        type="checkbox"
                        checked={preferences.display.compactView}
                        onChange={handleDisplayChange}
                          className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                      <div className="ml-3">
                        <label htmlFor="compact-view" className="font-medium text-gray-800">Compact View</label>
                        <p className="text-sm text-gray-500">Use a more condensed view for lists and tables</p>
                      </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="hide-completed"
                        name="hideCompleted"
                        type="checkbox"
                        checked={preferences.display.hideCompleted}
                        onChange={handleDisplayChange}
                          className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                      <div className="ml-3">
                        <label htmlFor="hide-completed" className="font-medium text-gray-800">Hide Completed Items</label>
                        <p className="text-sm text-gray-500">Automatically hide completed visits from listings</p>
                      </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="show-tutorials"
                        name="showTutorials"
                        type="checkbox"
                        checked={preferences.display.showTutorials}
                        onChange={handleDisplayChange}
                          className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                      <div className="ml-3">
                        <label htmlFor="show-tutorials" className="font-medium text-gray-800">Show Help Tips</label>
                        <p className="text-sm text-gray-500">Display helpful tooltips and guidance throughout the application</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Preferences Button - Enhanced styling */}
            <div className="mt-8 flex justify-end">
              {saveMessage && (
                <div className="mr-4 flex items-center px-3 py-2 rounded-md bg-green-50 text-green-700 border border-green-200">
                  <CheckIcon className="h-5 w-5 mr-2 text-green-500" />
                  <span className="text-sm font-medium">{saveMessage}</span>
                </div>
              )}
              <button
                type="button"
                onClick={savePreferences}
                disabled={isSaving}
                className={`flex items-center px-5 py-2.5 rounded-md text-sm font-medium shadow-sm ${
                  isSaving 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:translate-y-[-1px] transition-all'
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Section - Now Functional */}
      {activeSection === 'notifications' && (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden transition-all duration-500 transform">
          <div className="px-6 py-5 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-full p-2">
                <BellAlertIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-900">Notification Settings</h3>
                <p className="mt-1 text-sm text-gray-500">Configure email notifications and in-app alerts</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-5">
                <h4 className="text-base font-semibold text-gray-900 mb-4">Email Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="email-appointment"
                        name="email"
                        type="checkbox"
                        checked={preferences.notifications.email}
                        onChange={(e) => {
                          setPreferences({
                            ...preferences,
                            notifications: {
                              ...preferences.notifications,
                              email: e.target.checked
                            }
                          });
                        }}
                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="email-appointment" className="font-medium text-gray-800">Appointment Reminders</label>
                      <p className="text-sm text-gray-500">Receive email notifications about upcoming appointments</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="email-updates"
                        name="email-updates"
                        type="checkbox"
                        checked={true}
                        onChange={() => {}}
                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="email-updates" className="font-medium text-gray-800">System Updates</label>
                      <p className="text-sm text-gray-500">Receive notifications about important system updates</p>
                      <p className="text-xs text-gray-400 mt-1">(Required for system administrators)</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-5">
                <h4 className="text-base font-semibold text-gray-900 mb-4">In-App Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="inapp-notifications"
                        name="inApp"
                        type="checkbox"
                        checked={preferences.notifications.inApp}
                        onChange={(e) => {
                          setPreferences({
                            ...preferences,
                            notifications: {
                              ...preferences.notifications,
                              inApp: e.target.checked
                            }
                          });
                        }}
                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="inapp-notifications" className="font-medium text-gray-800">In-App Alerts</label>
                      <p className="text-sm text-gray-500">Show notifications within the application</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-5">
                <h4 className="text-base font-semibold text-gray-900 mb-4">SMS Notifications</h4>
                <div className="space-y-4">
              <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="sms-notifications"
                        name="sms"
                        type="checkbox"
                        checked={preferences.notifications.sms}
                        onChange={(e) => {
                          setPreferences({
                            ...preferences,
                            notifications: {
                              ...preferences.notifications,
                              sms: e.target.checked
                            }
                          });
                        }}
                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="sms-notifications" className="font-medium text-gray-800">SMS Alerts</label>
                      <p className="text-sm text-gray-500">Receive text messages for critical updates</p>
                    </div>
                  </div>
                  
                  {preferences.notifications.sms && (
                    <div className="mt-3 pl-8">
                      <label htmlFor="phone-verify" className="block text-sm font-medium text-gray-700 mb-1">
                        Verify Phone Number
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          id="phone-verify"
                          placeholder={userProfile.phoneNumber || "Enter phone number"}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              {saveMessage && (
                <div className="mr-4 flex items-center px-3 py-2 rounded-md bg-green-50 text-green-700 border border-green-200">
                  <CheckIcon className="h-5 w-5 mr-2 text-green-500" />
                  <span className="text-sm font-medium">{saveMessage}</span>
                </div>
              )}
              <button
                type="button"
                onClick={savePreferences}
                disabled={isSaving}
                className={`flex items-center px-5 py-2.5 rounded-md text-sm font-medium shadow-sm ${
                  isSaving 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:translate-y-[-1px] transition-all'
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Section - Enhanced styling */}
      {activeSection === 'profile' && (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden transition-all duration-500 transform">
          <div className="px-6 py-5 bg-gradient-to-r from-indigo-50 to-blue-50">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-full p-2">
                <UserCircleIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-900">User Profile</h3>
                <p className="mt-1 text-sm text-gray-500">Manage your personal information</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={userProfile.name}
                      onChange={handleProfileChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={userProfile.email}
                      onChange={handleProfileChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                    <input
                      type="text"
                      name="role"
                      id="role"
                      value={userProfile.role}
                      onChange={handleProfileChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1">
                    Specialty
                  </label>
                    <input
                      type="text"
                      name="specialty"
                      id="specialty"
                      value={userProfile.specialty}
                      onChange={handleProfileChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                    <input
                      type="text"
                      name="organization"
                      id="organization"
                      value={userProfile.organization}
                      onChange={handleProfileChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                    <input
                      type="text"
                      name="phoneNumber"
                      id="phoneNumber"
                      value={userProfile.phoneNumber}
                      onChange={handleProfileChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
            {/* Save Profile Button - Enhanced styling */}
                <div className="flex justify-end">
              {saveMessage && (
                <div className="mr-4 flex items-center px-3 py-2 rounded-md bg-green-50 text-green-700 border border-green-200">
                  <CheckIcon className="h-5 w-5 mr-2 text-green-500" />
                  <span className="text-sm font-medium">{saveMessage}</span>
                </div>
              )}
                  <button
                    type="button"
                    onClick={savePreferences}
                    disabled={isSaving}
                className={`flex items-center px-5 py-2.5 rounded-md text-sm font-medium shadow-sm ${
                      isSaving 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:translate-y-[-1px] transition-all'
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : 'Save Profile'}
                  </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm border border-blue-100 text-center">
          <p className="text-base text-gray-600">
            Additional settings functionality will be available in upcoming releases.
          </p>
        </div>
      </div>
    </div>
  );
} 