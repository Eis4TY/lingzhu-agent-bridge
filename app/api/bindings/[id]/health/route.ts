import { NextRequest, NextResponse } from 'next/server';
import { getBinding } from '@/services/binding';
import { AutoGLMClient } from '@/protocols/autoglm';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const binding = await getBinding(params.id);

    if (!binding) {
        return NextResponse.json({ error: 'Binding not found' }, { status: 404 });
    }

    const startTime = Date.now();

    if (binding.targetProtocol === 'autoglm') {
        if (!binding.targetUrl || !binding.authKey) {
            return NextResponse.json({
                status: 'error',
                message: 'Missing Target URL or Auth Key'
            });
        }

        try {
            // Test WebSocket Connection
            const client = new AutoGLMClient(binding.targetUrl, binding.authKey);

            const connectionPromise = new Promise<{ status: 'connected' | 'error', message?: string }>((resolve) => {
                let resolved = false;

                const cleanup = () => {
                    client.removeAllListeners();
                    client.disconnect();
                };

                const timer = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        cleanup();
                        resolve({ status: 'error', message: 'Connection timed out (5s)' });
                    }
                }, 5000);

                client.on('open', () => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timer);
                        cleanup();
                        resolve({ status: 'connected' });
                    }
                });

                client.on('error', (err) => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timer);
                        cleanup();
                        resolve({ status: 'error', message: err.message || 'Connection failed' });
                    }
                });

                try {
                    client.connect();
                } catch (e: unknown) {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timer);
                        cleanup();
                        const msg = e instanceof Error ? e.message : String(e);
                        resolve({ status: 'error', message: msg });
                    }
                }
            });

            const result = await connectionPromise;
            return NextResponse.json({
                ...result,
                latency: Date.now() - startTime
            });

        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            return NextResponse.json({
                status: 'error',
                message: msg,
                latency: Date.now() - startTime
            });
        }



        return NextResponse.json({
            status: 'unknown',
            message: 'Protocol health check not implemented'
        });
    }
}
