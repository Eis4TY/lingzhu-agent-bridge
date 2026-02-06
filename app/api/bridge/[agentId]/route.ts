import { NextRequest } from 'next/server';
import { handleBridgeRequest } from '@/services/bridge/engine';
import { LingzhuRequest } from '@/protocols/types';

export const runtime = 'nodejs'; // Use Node.js runtime for streams if needed, though simple SSE works in Edge too, but we use 'ws' lib.

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    const agentId = (await params).agentId;

    // Parse body
    let body: LingzhuRequest;
    try {
        body = await req.json();
    } catch (e) {
        return new Response('Invalid JSON', { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (data: string) => {
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            };

            const closeStream = () => {
                controller.close();
            };

            await handleBridgeRequest(agentId, body, sendEvent, closeStream);
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
