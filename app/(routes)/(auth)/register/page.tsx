'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/app/lib/firebase';
import Link from 'next/link';
import { UserPlusIcon, ArrowPathIcon, CheckIcon, XMarkIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

interface InvitationDetails {
  email: string;
  role: string;
  organization?: string;
  specialty?: string;
  valid: boolean;
  expiresAt?: Date;
}

// Create a client component that uses searchParams
function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Invitation validation
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  
  // Validate invitation token if present
  useEffect(() => {
    const validateToken = async () => {
      if (!token) return;
      
      setIsValidatingToken(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/users/invitation/validate?token=${token}`);
        
        if (!response.ok) {
          throw new Error('Invalid or expired invitation token');
        }
        
        const data = await response.json();
        setInvitation({
          email: data.email,
          role: data.role,
          organization: data.organization,
          specialty: data.specialty,
          valid: true,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
        });
        
        // Pre-fill email field
        setEmail(data.email);
      } catch (err) {
        console.error('Error validating token:', err);
        setInvitation({
          email: '',
          role: '',
          valid: false
        });
        setError('The invitation link is invalid or has expired.');
      } finally {
        setIsValidatingToken(false);
      }
    };
    
    validateToken();
  }, [token]);
  
  // Handle form validation
  const validateForm = (): boolean => {
    setError(null);
    
    if (token && !invitation?.valid) {
      setError('The invitation link is invalid or has expired.');
      return false;
    }
    
    if (!email) {
      setError('Email is required');
      return false;
    }
    
    if (token && email !== invitation?.email) {
      setError('You must use the email address from the invitation.');
      return false;
    }
    
    if (!displayName) {
      setError('Name is required');
      return false;
    }
    
    if (!password) {
      setError('Password is required');
      return false;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };
  
  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update display name
      await updateProfile(user, {
        displayName
      });
      
      // Create user profile in the database, including the invitation token if present
      const profileData = {
        firebaseUid: user.uid,
        email: user.email,
        displayName,
        // If using an invitation, include the token for verification
        ...(token ? { invitationToken: token } : {})
      };
      
      // Save the user profile
      const profileResponse = await fetch('/api/users/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(profileData)
      });
      
      if (!profileResponse.ok) {
        throw new Error('Failed to create user profile');
      }
      
      setSuccessMessage('Registration successful! Redirecting to login...');
      
      // Redirect after a short delay for success message to be visible
      setTimeout(() => {
        // If registered with invitation, go to dashboard, otherwise go to login
        router.push(token ? '/dashboard' : '/login');
      }, 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Handle Firebase Auth errors
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError(`Registration failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div>
          {/* App Logo/Icon would go here */}
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          {token && (
            <div className="mt-2 text-center">
              {isValidatingToken ? (
                <div className="flex items-center justify-center text-blue-600">
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                  <span>Validating invitation...</span>
                </div>
              ) : invitation?.valid ? (
                <div className="mt-2 bg-green-50 p-3 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        Valid invitation for {invitation.email}
                      </p>
                      <p className="mt-1 text-xs text-green-700">
                        Role: {invitation.role}
                        {invitation.organization && ` • ${invitation.organization}`}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 bg-red-50 p-3 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <XMarkIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">
                        Invalid invitation
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={token && invitation?.valid}
                className={`mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${token && invitation?.valid ? 'bg-gray-100' : ''}`}
                placeholder="you@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters long
              </p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 p-3 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XMarkIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 p-3 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{successMessage}</p>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={loading || (token && !invitation?.valid)}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${(token && !invitation?.valid) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  Create Account
                </>
              )}
            </button>
          </div>
        </form>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Already have an account?
              </span>
            </div>
          </div>
          
          <div className="mt-6">
            <Link
              href="/login"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <EnvelopeIcon className="h-5 w-5 mr-2" />
              Sign in to your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
} 