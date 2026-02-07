import { NextRequest, NextResponse } from 'next/server';
import { ProtocolTransformer } from '@/services/bridge/transformer';
import { getBinding } from '@/services/binding';
import { LingzhuRequest } from '@/protocols/types';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { bindingId, request, execute } = body;

    // Validate inputs immediately
    if (!bindingId || !request) {
        return NextResponse.json({ error: 'Missing bindingId or request' }, { status: 400 });
    }

    const binding = getBinding(bindingId);
    if (!binding) {
        return NextResponse.json({ error: 'Binding not found' }, { status: 404 });
    }

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const sendEvent = (event: string, data: any) => {
                const payload = typeof data === 'string' ? data : JSON.stringify(data);
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${payload}\n\n`));
            };

            const startTime = Date.now();
            sendEvent('trace', `[${Date.now() - startTime}ms] Starting Sandbox Execution...`);

            // 1. Transform Request
            let transformedRequest;
            try {
                transformedRequest = await ProtocolTransformer.transformRequest(
                    binding.targetProtocol,
                    request as LingzhuRequest,
                    request.metadata?.conversation_id || 'sandbox-test',
                    { requestTemplate: binding.requestTemplate, model: binding.model }
                );
                sendEvent('trace', `[${Date.now() - startTime}ms] Request Transformed successfully.`);
                sendEvent('transformed_request', transformedRequest);
            } catch (e) {
                sendEvent('error', `Transformation Failed: ${e}`);
                sendEvent('done', {});
                controller.close();
                return;
            }

            // 2. Execute
            if (execute) {
                let rawResponse = null;

                // Custom/OpenAI Protocol
                if (binding.targetProtocol === 'custom' || binding.targetProtocol === 'openai') {
                    try {
                        sendEvent('trace', `[${Date.now() - startTime}ms] Sending Request to ${binding.targetUrl}...`);
                        const headers: Record<string, string> = {
                            'Content-Type': 'application/json',
                            'Accept': 'text/event-stream'
                        };
                        if (binding.authType === 'bearer' && binding.authKey) {
                            headers['Authorization'] = `Bearer ${binding.authKey}`;
                        }
                        if (binding.customHeaders) {
                            Object.assign(headers, binding.customHeaders);
                        }

                        // Use fetch, but we might not support streaming *from* the target yet in this simple fetch
                        // For now, we wait for full response, then emit it.
                        // Ideally we would pipe the response body if we wanted full streaming end-to-end.
                        const res = await fetch(binding.targetUrl, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(transformedRequest),
                            cache: 'no-store',
                            // @ts-ignore - duplex is needed for Node 18+ streams sometimes but standard fetch in Next 15+ handles it
                            duplex: 'half'
                        });

                        let finalTransformed = null;

                        if (!res.body) {
                            // Fallback to text if no body (shouldn't happen with fetch usually unless head request?)
                            const text = await res.text();
                            try {
                                rawResponse = JSON.parse(text);
                            } catch {
                                rawResponse = { text_response: text };
                            }

                            // Transform immediately since it's full response
                            try {
                                finalTransformed = await ProtocolTransformer.transformResponse(
                                    binding.targetProtocol,
                                    rawResponse,
                                    request.message_id || 'sandbox-msg-id',
                                    request.agent_id || 'sandbox-agent-id',
                                    {
                                        responseTemplate: binding.responseTemplate,
                                        finishMatchValue: binding.finishMatchValue
                                    }
                                );
                            } catch (e) {
                                console.error("Transform failed", e);
                            }

                            sendEvent('raw_response_chunk', {
                                index: 0,
                                data: text, // Send raw text as data
                                transformed: finalTransformed,
                                timestamp: Date.now()
                            });
                        } else {
                            const reader = res.body.getReader();
                            const decoder = new TextDecoder();
                            let chunkIndex = 0;
                            let buffer = '';

                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                const chunk = decoder.decode(value, { stream: true });
                                buffer += chunk;

                                // Process lines in buffer
                                const lines = buffer.split('\n');
                                // Keep the last incomplete line in buffer
                                buffer = lines.pop() || '';

                                let currentTransformed = null;
                                let currentSource = null;

                                // Try to find the last valid data line in this chunk to preview transformation
                                for (let i = lines.length - 1; i >= 0; i--) {
                                    const line = lines[i].trim();
                                    if (line.startsWith('data: ')) {
                                        const dataContent = line.slice(6);
                                        if (dataContent === '[DONE]') continue;
                                        try {
                                            currentSource = JSON.parse(dataContent);
                                            break; // Found the latest valid JSON object
                                        } catch {
                                            // ignore parse error for individual line
                                        }
                                    }
                                }

                                // Fallback: If no SSE data found but we have content, maybe it's just a text stream?
                                if (!currentSource && lines.length > 0) {
                                    // For text stream, we might want the WHOLE buffer so far, or just the new lines?
                                    // "Raw Response" shows the chunk. 
                                    // For valid JSON transformation of a text stream, we usually need the whole text.
                                    // But let's try to wrap the current chunk's lines if they aren't empty?
                                    // Actually, for "Text Response", the user likely maps {{text_response}}. 
                                    // Let's pass the text content of this chunk (or accumulated?)
                                    // To be consistent with "streaming", we usually want the incremental update or the full state?
                                    // OpenAI style returns "delta". 
                                    // Let's fallback to wrapping the raw text of this chunk.
                                    const textChunk = lines.join('\n');
                                    if (textChunk.trim()) {
                                        currentSource = { text_response: textChunk };
                                    }
                                }

                                if (currentSource) {
                                    try {
                                        currentTransformed = await ProtocolTransformer.transformResponse(
                                            binding.targetProtocol,
                                            currentSource,
                                            request.message_id || 'sandbox-msg-id',
                                            request.agent_id || 'sandbox-agent-id',
                                            {
                                                responseTemplate: binding.responseTemplate,
                                                finishMatchValue: binding.finishMatchValue
                                            }
                                        );
                                    } catch (e) {
                                        // transformation error
                                    }
                                }

                                sendEvent('raw_response_chunk', {
                                    index: chunkIndex++,
                                    data: chunk, // We still send the raw chunk characters to the UI
                                    transformed: currentTransformed,
                                    timestamp: Date.now()
                                });
                            }
                            try {
                                rawResponse = JSON.parse(buffer);
                            } catch {
                                rawResponse = { text_response: buffer };
                            }
                        }

                        sendEvent('trace', `[${Date.now() - startTime}ms] Execution Success.`);

                    } catch (e) {
                        sendEvent('trace', `[${Date.now() - startTime}ms] Execution Failed: ${e}`);
                        sendEvent('error', `Execution Failed: ${e}`);
                    }
                }


                // Fallback Mock
                if (!rawResponse) {
                    rawResponse = {
                        id: 'chatcmpl-mock-fallback',
                        object: 'chat.completion',
                        choices: [{
                            message: { role: 'assistant', content: 'Mock response (Execution failed or skipped).' },
                            finish_reason: 'stop'
                        }]
                    };

                    const transformed = await ProtocolTransformer.transformResponse(
                        'openai', // Assume OpenAI structure for mock
                        rawResponse,
                        request.message_id || 'sandbox-msg-id',
                        request.agent_id || 'sandbox-agent-id',
                        {}
                    );

                    sendEvent('trace', `[${Date.now() - startTime}ms] Using Fallback Mock Response.`);
                    sendEvent('raw_response_chunk', {
                        index: 0,
                        data: JSON.stringify(rawResponse, null, 2),
                        transformed: transformed,
                        timestamp: Date.now()
                    });
                }

                // 3. Transform Response
                if (rawResponse) {
                    try {
                        const transformedResponse = await ProtocolTransformer.transformResponse(
                            binding.targetProtocol,
                            rawResponse,
                            request.message_id || 'sandbox-msg-id',
                            request.agent_id || 'sandbox-agent-id',
                            {
                                responseTemplate: binding.responseTemplate,
                                finishMatchValue: binding.finishMatchValue
                            }
                        );
                        sendEvent('trace', `[${Date.now() - startTime}ms] Response Transformed.`);
                        sendEvent('transformed_response_chunk', transformedResponse);
                    } catch (e) {
                        sendEvent('error', `Response Transformation Failed: ${e}`);
                    }
                }
                sendEvent('done', {});
                controller.close();
            }
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
