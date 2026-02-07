import fs from 'fs';
import path from 'path';

const LOGS_FILE = path.join(process.cwd(), 'logs.json');

import { RequestLog, SystemLog } from '@/protocols/types';

const SYSTEM_LOGS_BUFFER_SIZE = 5000;

// Use global to share logs buffer across module reloads
const globalForLogs = global as unknown as { systemLogsBuffer: SystemLog[] };
if (!globalForLogs.systemLogsBuffer) {
    globalForLogs.systemLogsBuffer = [];
}

export function getSystemLogs(since?: number): SystemLog[] {
    const logs = globalForLogs.systemLogsBuffer;
    if (since) {
        return logs.filter(log => log.timestamp > since);
    }
    return logs;
}

export function addSystemLog(level: 'info' | 'error' | 'warn', message: string) {
    const log: SystemLog = {
        timestamp: Date.now(),
        level,
        message
    };
    globalForLogs.systemLogsBuffer.push(log);
    if (globalForLogs.systemLogsBuffer.length > SYSTEM_LOGS_BUFFER_SIZE) {
        globalForLogs.systemLogsBuffer.shift();
    }
}

export function getLogs(limit: number = 100): RequestLog[] {
    if (!fs.existsSync(LOGS_FILE)) {
        return [];
    }
    const data = fs.readFileSync(LOGS_FILE, 'utf-8');
    try {
        const logs: RequestLog[] = JSON.parse(data);
        // Sort by timestamp descending
        return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    } catch (e) {
        return [];
    }
}

export function addLog(log: RequestLog) {
    const logs = getLogs(10000); // Keep last 10000 logs
    logs.unshift(log); // Add to beginning
    if (logs.length > 10000) {
        logs.pop();
    }
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
}

export function updateLog(id: string, update: Partial<RequestLog>) {
    const logs = getLogs(10000);
    const index = logs.findIndex((l) => l.id === id);
    if (index >= 0) {
        logs[index] = { ...logs[index], ...update };
        fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
    }
}

export function clearLogs() {
    // Clear system logs buffer
    globalForLogs.systemLogsBuffer = [];

    // Clear request logs file
    fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2));
}
