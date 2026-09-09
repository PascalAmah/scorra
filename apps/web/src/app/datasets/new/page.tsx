'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { AppShell } from '@/components/dashboard/shell';
import { Topbar } from '@/components/dashboard/topbar';
import { UploadWizard } from '@/components/datasets/upload-wizard';
import { api } from '@/lib/api';

export default function NewDatasetPage() {
  return (
    <AppShell>
      <Topbar title="Import dataset" sub="DATASETS / IMPORT" />
      <Suspense fallback={null}>
        <Wizard />
      </Suspense>
    </AppShell>
  );
}

function Wizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('datasetId') ?? undefined;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (mounted && !api.isAuthenticated) {
      router.replace('/login');
    }
  }, [mounted, router]);

  if (!mounted || !api.isAuthenticated) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
          Loading…
        </p>
      </div>
    );
  }

  return <UploadWizard datasetId={datasetId} />;
}
