'use client';

import React from 'react';
import RoleGuard from '@/app/components/RoleGuard';
import { UserRole } from '@/app/models/User';

export default function UserManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={[UserRole.ADMIN]} fallbackUrl="/settings">
      {children}
    </RoleGuard>
  );
} 