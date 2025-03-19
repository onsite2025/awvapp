'use client';

import React from 'react';
import AuthGuard from '@/app/components/AuthGuard';

export default function VisitsLayout({
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
