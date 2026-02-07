import { NextRequest } from 'next/server';
import { handleBridgeRequest } from '@/services/bridge/engine';
import { LingzhuRequest } from '@/protocols/types';
import { addLog, updateLog } from '@/services/logger';

export const runtime = 'nodejs'; // Use Node.js runtime for streams if needed, though simple SSE works in Edge too, but we use 'ws' lib.

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    const agentId = (await params).agentId;

    // Check API Key
    const { getSettings } = await import('@/services/settings');
    const settings = getSettings();
    if (settings.apiKey) {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || authHeader !== `Bearer ${settings.apiKey}`) {
            return new Response('Unauthorized', { status: 401 });
        }
    }

    // Parse body
    let body: LingzhuRequest;
    try {
        body = await req.json();
    } catch (e) {
        return new Response('Invalid JSON', { status: 400 });
    }

    const logId = crypto.randomUUID();
    const startTime = Date.now();
    const requestSummary = body.message?.[0]?.text?.slice(0, 50) || 'No text';

    console.log(`[Bridge] Incoming request for Agent: ${agentId}`);
    console.log(`[Bridge] Request ID: ${logId} | Summary: ${requestSummary}`);
    console.log(`[Bridge] Full Request Body: ${JSON.stringify(body, null, 2)}`);

    addLog({
        id: logId,
        timestamp: startTime,
        agentId: agentId,
        request_summary: requestSummary,
        status: 'pending',
        full_request: body
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (data: string) => {
                console.log(`[Bridge] SSE Output [${logId}]: ${data}`);
                controller.enqueue(encoder.encode(`event: message\ndata: ${data}\n\n`));
            };

            const closeStream = () => {
                const duration = Date.now() - startTime;
                console.log(`[Bridge] Request ID: ${logId} completed in ${duration}ms`);
                updateLog(logId, { status: 'success', duration_ms: duration });
                controller.close();
            };

            try {
                await handleBridgeRequest(agentId, body, sendEvent, closeStream);
            } catch (e) {
                const duration = Date.now() - startTime;
                console.error(`[Bridge] Request ID: ${logId} failed: ${e}`);
                updateLog(logId, { status: 'error', error_message: String(e), duration_ms: duration });
                sendEvent(JSON.stringify({ role: 'system', type: 'error', answer: 'Internal Error' }));
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
