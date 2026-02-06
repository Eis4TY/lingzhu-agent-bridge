import fs from 'fs';
import path from 'path';

const BINDINGS_FILE = path.join(process.cwd(), 'bindings.json');

export interface ProtocolBinding {
    id: string;
    name: string;
    enabled: boolean;
    targetUrl: string;
    targetProtocol: 'autoglm' | 'custom';
    model?: string;
    authType?: 'bearer' | 'header' | 'none';
    authKey?: string;
    customHeaders?: Record<string, string>;
    requestTemplate?: string;
    responseTemplate?: string;
    finishMatchValue?: string;
    mappingRules?: BindingMapping[];
}

export interface BindingMapping {
    lingzhuField: string;
    targetField: string;
    type: 'simple' | 'fixed' | 'script';
    value?: string; // For fixed or script
}

export function getBindings(): ProtocolBinding[] {
    if (!fs.existsSync(BINDINGS_FILE)) {
        return [];
    }
    const data = fs.readFileSync(BINDINGS_FILE, 'utf-8');
    try {
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

export function saveBinding(binding: ProtocolBinding) {
    const bindings = getBindings();
    const index = bindings.findIndex((b) => b.id === binding.id);
    if (index >= 0) {
        bindings[index] = binding;
    } else {
        bindings.push(binding);
    }
    fs.writeFileSync(BINDINGS_FILE, JSON.stringify(bindings, null, 2));
}

export function deleteBinding(id: string) {
    const bindings = getBindings();
    const newBindings = bindings.filter((b) => b.id !== id);
    fs.writeFileSync(BINDINGS_FILE, JSON.stringify(newBindings, null, 2));
}

export function getBinding(id: string): ProtocolBinding | undefined {
    return getBindings().find((b) => b.id === id);
}
