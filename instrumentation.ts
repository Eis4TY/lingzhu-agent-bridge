
let registered = false;

export async function register() {
    if (registered) return;
    registered = true;

    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { addSystemLog } = await import('@/services/logger');

        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args) => {
            const msg = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            addSystemLog('info', msg);
            originalLog.apply(console, args);
        };

        console.error = (...args) => {
            const msg = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            addSystemLog('error', msg);
            originalError.apply(console, args);
        };

        console.warn = (...args) => {
            const msg = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            addSystemLog('warn', msg);
            originalWarn.apply(console, args);
        };
    }
}
