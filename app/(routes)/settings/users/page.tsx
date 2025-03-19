'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  PencilIcon,
  TrashIcon,
  PlusIcon,
  EnvelopeIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import PageNavigation from '@/app/components/PageNavigation';
import { UserRole } from '@/app/models/User';

// Define user type for frontend
interface User {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  isActive?: boolean;
  organization?: string;
  specialty?: string;
  lastLogin?: string;
  createdAt?: string;
}

// Initial empty state
const emptyUsers: User[] = [];

export default function UserManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>(emptyUsers);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.PROVIDER);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        if (!user) return;
        
        // Fetch current user's profile to check role
        const response = await fetch('/api/users/profile', {
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setIsAdmin(userData.role === 'ADMIN');
          
          if (userData.role !== 'ADMIN') {
            setError('You do not have permission to access this page.');
          } else {
            // If admin, fetch all users
            fetchUsers();
          }
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify permissions.');
      }
    };
    
    checkAdmin();
  }, [user]);
  
  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!user) return;
      
      const token = await user.getIdToken();
      const response = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users.');
      
      // In development, create mock data
      if (process.env.NODE_ENV !== 'production') {
        setUsers([
          {
            id: '1',
            email: 'admin@example.com',
            displayName: 'Admin User',
            role: UserRole.ADMIN,
            isActive: true,
            organization: 'Health System',
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString()
          },
          {
            id: '2',
            email: 'doctor@example.com',
            displayName: 'Dr. Smith',
            role: UserRole.PROVIDER,
            isActive: true,
            specialty: 'Family Medicine',
            organization: 'Health System',
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString()
          },
          {
            id: '3',
            email: 'nurse@example.com',
            displayName: 'Nurse Johnson',
            role: UserRole.STAFF,
            isActive: true,
            organization: 'Health System',
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Update user role
  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      if (!user) return;
      
      setError(null); // Clear previous errors
      
      const token = await user.getIdToken();
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user role');
      }
      
      // Update the user in the local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      
      setSuccessMessage('User role updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating user role:', err);
      setError(err.message || 'Failed to update user role.');
      
      // Roll back the change in the UI
      setUsers([...users]); // Force re-render with original data
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Toggle user active status
  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      if (!user) return;
      
      const token = await user.getIdToken();
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user status');
      }
      
      // Update the user in the local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, isActive } : u
      ));
      
      setSuccessMessage(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating user status:', err);
      setError('Failed to update user status.');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Invite new user
  const inviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError(null);
    
    try {
      if (!user) return;
      
      const token = await user.getIdToken();
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }
      
      setSuccessMessage('Invitation sent successfully');
      setInviteEmail('');
      setShowInviteModal(false);
      
      // In development, add the "invited" user to the list
      if (process.env.NODE_ENV !== 'production') {
        setUsers([...users, {
          id: Date.now().toString(),
          email: inviteEmail,
          role: inviteRole,
          isActive: false,
          createdAt: new Date().toISOString()
        }]);
      }
    } catch (err) {
      console.error('Error inviting user:', err);
      setError('Failed to send invitation.');
    } finally {
      setIsSending(false);
    }
  };
  
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-purple-100 text-purple-800';
      case UserRole.PROVIDER:
        return 'bg-blue-100 text-blue-800';
      case UserRole.STAFF:
        return 'bg-green-100 text-green-800';
      case UserRole.PATIENT:
        return 'bg-yellow-100 text-yellow-800';
      case UserRole.BILLING:
        return 'bg-orange-100 text-orange-800';
      case UserRole.RESEARCHER:
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Edit user function
  const handleEditUser = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setShowEditModal(true);
  };

  // Update user details
  const updateUserDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    try {
      if (!user) return;
      
      const token = await user.getIdToken();
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName: selectedUser.displayName,
          role: selectedUser.role,
          isActive: selectedUser.isActive
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      // Update the user in the local state
      setUsers(users.map(u => 
        u.id === selectedUser.id ? selectedUser : u
      ));
      
      setSuccessMessage('User updated successfully');
      setShowEditModal(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user.');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Delete user function - handles showing the confirmation dialog
  const handleDeleteUser = (userToDelete: User) => {
    setSelectedUser(userToDelete);
    setShowDeleteModal(true);
  };

  // Confirm delete user - handles the actual deletion API call
  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      if (!user) return;
      
      // Get auth token
      const token = await user.getIdToken();
      
      // Special handling for development user - add bypass header
      const isDevUser = selectedUser.email === 'dev@example.com' || 
                        selectedUser.displayName === 'Development User';
                        
      // Call the delete API with confirmation header
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-confirm-delete': 'confirmed',
          // Add special bypass header for development user
          ...(isDevUser && { 'x-bypass-dev-mode': 'true' })
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
      
      // Update the UI to remove the deleted user
      setUsers(users.filter(u => u.id !== selectedUser.id));
      setSuccessMessage(`User ${selectedUser.email} has been deleted`);
      setShowDeleteModal(false);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user.');
    } finally {
      setIsDeleting(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };
  
  if (!isAdmin && !loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden p-6">
        <div className="text-center">
          <UserGroupIcon className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            You do not have permission to access user management.
          </p>
          <Link 
            href="/dashboard" 
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-lg shadow-lg p-8 text-white">
        <div className="flex items-center">
          <UserGroupIcon className="h-8 w-8 mr-4 text-white" />
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="mt-2 text-indigo-100 max-w-2xl">
              Manage users, permissions, and invitations in your organization
            </p>
          </div>
        </div>
      </div>
      
      <PageNavigation />
      
      {/* Main Content */}
      <div className="mt-8">
        {error && users.length === 0 && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 my-4 shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <XMarkIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800">Access Error</h3>
                <div className="mt-2 text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Return to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {isAdmin && (
          <div className="bg-white shadow-lg rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-white to-indigo-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-indigo-100 rounded-full p-2">
                    <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-semibold text-gray-900">Users</h2>
                    <p className="text-sm text-gray-500">Manage staff access and permissions</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transform hover:translate-y-[-1px] transition-all"
                >
                  <PlusIcon className="h-4 w-4 mr-1.5" />
                  Invite User
                </button>
              </div>
            </div>
            
            {/* User List */}
            <div>
              {loading ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <ArrowPathIcon className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
                    <p className="text-indigo-600 font-medium">Loading users...</p>
                    <p className="text-gray-500 text-sm mt-2">Please wait while we fetch user data</p>
                  </div>
                </div>
              ) : error && users.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-red-500">{error}</p>
                  <button
                    onClick={fetchUsers}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-1.5" />
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Login
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
                                {user.displayName ? (
                                  <span className="text-sm font-medium text-indigo-700">
                                    {user.displayName.split(' ').map(n => n[0]).join('')}
                                  </span>
                                ) : (
                                  <UserGroupIcon className="h-5 w-5 text-indigo-500" />
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.displayName || 'No Name'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.email}
                                </div>
                                {user.specialty && (
                                  <div className="text-xs text-gray-500 mt-1 bg-gray-100 inline-block px-2 py-0.5 rounded">
                                    {user.specialty}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={user.role}
                              onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                              className={`text-sm rounded-full px-2.5 py-1 ${getRoleBadgeColor(user.role)} border-0 bg-opacity-80 focus:ring-blue-500 shadow-sm`}
                            >
                              {Object.values(UserRole).map(role => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className={`inline-flex rounded-full h-2.5 w-2.5 mr-1.5 ${user.isActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
                              <span className="text-sm text-gray-700">
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.lastLogin)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex space-x-2 justify-end">
                              <button
                                onClick={() => toggleUserStatus(user.id, !user.isActive)}
                                className={`p-1.5 rounded-full hover:bg-gray-100 ${user.isActive ? 'text-red-400 hover:text-red-500' : 'text-green-400 hover:text-green-500'}`}
                                title={user.isActive ? 'Deactivate user' : 'Activate user'}
                              >
                                {user.isActive ? (
                                  <XMarkIcon className="h-5 w-5" />
                                ) : (
                                  <CheckIcon className="h-5 w-5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-1.5 rounded-full hover:bg-gray-100 text-blue-400 hover:text-blue-500"
                                title="Edit user"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="p-1.5 rounded-full hover:bg-gray-100 text-red-400 hover:text-red-500"
                                title="Delete user"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {users.length > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{users.length}</span> users
                  </p>
                  <button
                    onClick={fetchUsers}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-1.5" />
                    Refresh
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Success/Error notifications */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-50 p-4 rounded-md shadow-lg border border-green-200 max-w-md animate-fadeIn">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckIcon className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button 
                  onClick={() => setSuccessMessage(null)}
                  className="inline-flex rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {error && users.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-red-50 p-4 rounded-md shadow-lg border border-red-200 max-w-md animate-fadeIn">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XMarkIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button 
                  onClick={() => setError(null)}
                  className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Invite User Modal - Enhanced styling */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-indigo-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Invite New User</h3>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-500 bg-white rounded-full p-1 hover:bg-gray-100"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <form onSubmit={inviteUser} className="p-6">
              <div className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="user@example.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    {Object.values(UserRole).map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {inviteRole === UserRole.ADMIN 
                      ? 'This role has full system access and can manage all settings.'
                      : inviteRole === UserRole.PROVIDER 
                      ? 'Providers can create and manage patient visits and templates.'
                      : inviteRole === UserRole.STAFF
                      ? 'Staff can schedule appointments and assist with patient management.'
                      : inviteRole === UserRole.PATIENT
                      ? 'Patients can view their own records and upcoming appointments.'
                      : inviteRole === UserRole.BILLING
                      ? 'Billing staff can access invoice and payment information.'
                      : 'This role can access research-related data and reports.'}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending || !inviteEmail}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <PencilIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-500 bg-white rounded-full p-1 hover:bg-gray-100"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <form onSubmit={updateUserDetails} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Email
                  </label>
                  <p className="text-sm text-gray-900 font-medium">{selectedUser.email}</p>
                </div>
                
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={selectedUser.displayName || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, displayName: e.target.value})}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="User's display name"
                  />
                </div>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value as UserRole})}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    {Object.values(UserRole).map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="text-indigo-600 focus:ring-indigo-500"
                        name="status"
                        checked={selectedUser.isActive}
                        onChange={() => setSelectedUser({...selectedUser, isActive: true})}
                      />
                      <span className="ml-2">Active</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="text-red-600 focus:ring-red-500"
                        name="status"
                        checked={!selectedUser.isActive}
                        onChange={() => setSelectedUser({...selectedUser, isActive: false})}
                      />
                      <span className="ml-2">Inactive</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete User Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <TrashIcon className="h-5 w-5 text-red-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-gray-500 bg-white rounded-full p-1 hover:bg-gray-100"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-5">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Delete User</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete the user <span className="font-medium text-gray-900">{selectedUser.email}</span>?
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteUser}
                  disabled={isDeleting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-300"
                >
                  {isDeleting ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete User
                    </>
                  )}
                </button>
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 italic">
                  Warning: This action will permanently delete the user from the database.
                  Their profile and associated data cannot be recovered.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 