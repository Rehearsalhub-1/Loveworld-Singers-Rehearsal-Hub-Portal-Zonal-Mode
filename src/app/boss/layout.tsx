'use client';

import { PageLoader } from '@/components/PageLoader';

export default function BossLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageLoader>
      {children}
    </PageLoader>
  );
}


