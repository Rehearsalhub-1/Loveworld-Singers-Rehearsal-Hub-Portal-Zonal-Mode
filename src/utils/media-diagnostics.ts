import { BackendAPI } from '@/lib/api-client';

export interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export async function runMediaDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];
  try {
    const data = await BackendAPI.media.getAll({ limit: 1 });
    results.push({
      test: 'API Media Access',
      status: 'pass',
      message: 'Successfully connected to backend media service',
      details: data
    });
  } catch (err: any) {
    results.push({
      test: 'API Media Access',
      status: 'fail',
      message: `Failed to connect: ${err?.message || 'Unknown error'}`,
      details: err
    });
  }
  return results;
}

export function printDiagnostics(results: DiagnosticResult[]) {
  console.log('[Media Diagnostics]', results);
}
