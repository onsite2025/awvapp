'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import AuthGuard from '@/app/components/AuthGuard';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  allowedRoles?: string[];
}

interface UserProfile {
  id?: string;
  displayName?: string;
  name?: string;
  email?: string;
  role?: string;
  photoURL?: string;
  specialty?: string;
  organization?: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Patients', href: '/patients', icon: UserGroupIcon },
  { 
    name: 'Templates', 
    href: '/templates', 
    icon: DocumentTextIcon,
    allowedRoles: ['ADMIN', 'PROVIDER']
  },
  { name: 'Visits', href: '/visits', icon: ClipboardDocumentListIcon },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

// Add a fetchUserProfile function
const fetchUserProfile = async () => {
  try {
    // Get the Firebase auth token
    const { auth } = await import('../../lib/firebase');
    const currentUser = auth.currentUser;
    
    // CRITICAL: If we don't have a logged-in user, return null
    if (!currentUser) {
      console.log('No authenticated user found');
      return null;
    }
    
    console.log('Fetching profile for Firebase user:', currentUser.uid, currentUser.email);
    
    // Always get a token for authentication
    let token;
    try {
      token = await currentUser.getIdToken();
    } catch (tokenError) {
      console.warn('Unable to get auth token:', tokenError);
      return null;
    }
    
    // Fetch the user profile from the API with bypass header
    const response = await fetch('/api/users/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'x-bypass-dev-mode': 'true' // Add bypass to force real auth
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('Failed to fetch user profile:', response.statusText);
      return null;
    }
    
    const profileData = await response.json();
    console.log('Successfully fetched profile:', profileData);
    
    // Cache the profile in localStorage
    localStorage.setItem('awv-user-profile', JSON.stringify(profileData));
    
    return profileData;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    displayName: 'Loading...',
    role: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the user profile on component mount
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      const profile = await fetchUserProfile();
      if (profile) {
        setUserProfile({
          id: profile.id,
          displayName: profile.displayName || 'User',
          email: profile.email,
          role: profile.role,
          photoURL: profile.photoURL,
          specialty: profile.specialty,
          organization: profile.organization
        });
      }
      setIsLoading(false);
    };

    loadProfile();
  }, []);

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <div 
          className={`fixed inset-y-0 left-0 flex w-64 flex-col z-50 bg-white transform transition-transform ease-in-out duration-300 md:hidden ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-gray-200">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              AWV Platform
            </Link>
            <button 
              type="button" 
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              {navigation
                .filter(item => 
                  // If no allowedRoles specified, show to all users
                  !item.allowedRoles || 
                  // Otherwise, check if user's role is in allowedRoles
                  (userProfile.role && item.allowedRoles.includes(userProfile.role))
                )
                .map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                        active
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon
                        className={`mr-3 h-6 w-6 shrink-0 ${
                          active ? 'text-blue-600' : 'text-gray-500'
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                })}
            </div>

            <div className="mt-auto pt-6">
              <div className="space-y-1">
                <Link
                  href="/logout"
                  className="group flex items-center px-2 py-2 text-base font-medium text-gray-700 rounded-md hover:bg-gray-50"
                >
                  <ArrowRightOnRectangleIcon
                    className="mr-3 h-6 w-6 shrink-0 text-gray-500"
                    aria-hidden="true"
                  />
                  Sign out
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:fixed md:inset-y-0 md:flex md:flex-col md:w-64">
          <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
            <div className="flex h-16 shrink-0 items-center px-4 border-b border-gray-200">
              <Link href="/dashboard" className="text-xl font-bold text-blue-600">
                AWV Platform
              </Link>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto py-4 px-3">
              <div className="space-y-1">
                {navigation
                  .filter(item => 
                    // If no allowedRoles specified, show to all users
                    !item.allowedRoles || 
                    // Otherwise, check if user's role is in allowedRoles
                    (userProfile.role && item.allowedRoles.includes(userProfile.role))
                  )
                  .map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                          active
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <item.icon
                          className={`mr-3 h-5 w-5 shrink-0 ${
                            active ? 'text-blue-600' : 'text-gray-500'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    );
                  })}
              </div>

              <div className="mt-auto pt-6">
                <div className="space-y-1">
                  <Link
                    href="/logout"
                    className="group flex items-center px-2 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    <ArrowRightOnRectangleIcon
                      className="mr-3 h-5 w-5 shrink-0 text-gray-500"
                      aria-hidden="true"
                    />
                    Sign out
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="md:pl-64">
          <div className="mx-auto flex max-w-7xl flex-col">
            {/* Top navigation */}
            <div className="sticky top-0 z-10 flex h-16 shrink-0 border-b border-gray-200 bg-white shadow-sm">
              <button
                type="button"
                className="border-r border-gray-200 px-4 text-gray-500 md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              </button>
              <div className="flex flex-1 justify-end px-4">
                <div className="ml-4 flex items-center md:ml-6">
                  <div className="flex items-center space-x-3">
                    <Link href="/settings" onClick={() => localStorage.setItem('activeSettingsTab', 'profile')} className="flex items-center space-x-3 group">
                      <div className="flex-shrink-0">
                        {userProfile.photoURL ? (
                          <img
                            className="h-10 w-10 rounded-full border-2 border-transparent group-hover:border-blue-500 transition-all"
                            src={userProfile.photoURL}
                            alt={userProfile.displayName || ''}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full border-2 border-transparent group-hover:border-blue-500 transition-all bg-gray-100 flex items-center justify-center">
                            <UserCircleIcon className="h-8 w-8 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="hidden md:block">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {isLoading ? 'Loading...' : userProfile.displayName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {isLoading ? '' : userProfile.role}
                        </div>
                      </div>
                    </Link>
                    
                    {/* Add direct link to user management if admin */}
                    {userProfile.role === 'ADMIN' && (
                      <Link
                        href="/settings/users"
                        className="ml-2 p-1.5 rounded-full hover:bg-gray-100 text-blue-400 hover:text-blue-500"
                        title="User Management"
                      >
                        <UserGroupIcon className="h-5 w-5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
} 