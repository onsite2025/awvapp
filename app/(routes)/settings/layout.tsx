'use client';

import React from 'react';
import AuthGuard from '@/app/components/AuthGuard';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      {children}
    </AuthGuard>
  );
}
