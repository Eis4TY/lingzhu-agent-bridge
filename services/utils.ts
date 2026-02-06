
export function getValueByPath(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = obj;
    for (const part of parts) {
        if (current === undefined || current === null) return undefined;
        // Handle array indices
        if (Array.isArray(current) && !isNaN(Number(part))) {
            current = current[Number(part)];
        } else {
            current = current[part];
        }
    }
    return current;
}

export function substituteTemplate(template: string, sourceData: unknown): unknown {
    try {
        let processedString = template;

        // 1. Handle "key": "{{path}}" (Full Value Replacement)
        // We look for patterns like: "field": "{{some.path}}"
        // This allows replacing the string placeholder with a real JSON object (array, boolean, null, etc.)
        processedString = processedString.replace(/:\s*"\{\{([^}]+)\}\}"/g, (match, path) => {
            const val = getValueByPath(sourceData, path);
            // If val is strictly undefined, we might want to keep the literal placeholder or set null?
            // Let's set null for safety if undefined, or empty string.
            const jsonValue = val === undefined ? '""' : JSON.stringify(val);
            return `: ${jsonValue}`;
        });

        // 2. Handle embedded strings: "Hello {{path}}"
        // This is safe ONLY for string interpolation inside existing valid JSON string values.
        // We match {{path}} that wasn't caught by the above (e.g. inside a longer string).
        processedString = processedString.replace(/\{\{([^{}":]+)\}\}/g, (match, path) => {
            const val = getValueByPath(sourceData, path);
            // For embedded strings, we just convert to string. 
            // IMPORTANT: We must NOT JSON.stringify here because we are ALREADY inside a JSON string.
            // We just need to escape quotes? 
            // Actually, simplest is to just cast to string. If the string contains quotes, it might break JSON.
            // A robust way works on the PARSED object, but we are doing text substitution.
            // Let's assume the user knows what they are doing for simple strings.
            // To be tighter:
            let strVal = val !== undefined ? String(val) : "";
            // Escape quotes/backslashes if we are injecting into a JSON string?
            strVal = strVal.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
            return strVal;
        });

        return JSON.parse(processedString);
    } catch (e) {
        console.error("Template substitution failed:", e);
        console.log("Template was:", template);
        return { error: "Template substitution failed", details: String(e) };
    }
}
