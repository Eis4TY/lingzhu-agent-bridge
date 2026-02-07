import { NextRequest, NextResponse } from 'next/server';
import { getSystemLogs } from '@/services/logger';
import { register } from '@/instrumentation';

// Manually register instrumentation hooks to ensure they are active in development
// without requiring a full server restart.
register();


export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const since = parseInt(searchParams.get('since') || '0');
    const logs = getSystemLogs(since);
    return NextResponse.json(logs);
}
