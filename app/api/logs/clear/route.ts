import { NextResponse } from 'next/server';
import { clearLogs } from '@/services/logger';
import fs from 'fs';
import path from 'path';

export async function DELETE() {
    clearLogs();

    // Clear terminal log file (dev.log)
    const devLogPath = path.join(process.cwd(), 'dev.log');
    if (fs.existsSync(devLogPath)) {
        try {
            fs.writeFileSync(devLogPath, '');
        } catch (error) {
            console.error('Failed to clear dev.log:', error);
        }
    }

    return NextResponse.json({ success: true });
}
