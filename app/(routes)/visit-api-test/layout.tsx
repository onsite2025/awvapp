'use client';

import React from 'react';
import AuthGuard from '@/app/components/AuthGuard';

export default function VisitApiTestLayout({
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
