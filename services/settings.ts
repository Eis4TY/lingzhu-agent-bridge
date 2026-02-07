import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

export interface BridgeSettings {
    apiKey?: string;
}

export function getSettings(): BridgeSettings {
    if (!fs.existsSync(SETTINGS_FILE)) {
        return {};
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    try {
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

export function saveSettings(settings: BridgeSettings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
