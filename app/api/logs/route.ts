import { NextRequest, NextResponse } from 'next/server';
import { getLogs } from '@/services/logger';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const logs = getLogs(limit);
    return NextResponse.json(logs);
}
