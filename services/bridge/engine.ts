import { LingzhuRequest } from '@/protocols/types';
import { ProtocolTransformer } from '@/services/bridge/transformer';
import { getBinding } from '@/services/binding';


export async function handleBridgeRequest(
    agentId: string,
    request: LingzhuRequest,
    sendEvent: (data: string) => void,
    closeStream: () => void
) {
    const binding = getBinding(agentId);
    if (!binding || !binding.enabled) {
        sendEvent(JSON.stringify({ error: 'Agent not found or disabled' }));
        closeStream();
        return;
    }

    if (binding.targetProtocol === 'custom' || binding.targetProtocol === 'openai') {
        const protocol = binding.targetProtocol;
        try {
            const conversationId = crypto.randomUUID();
            // 1. Transform Request
            const transformedRequest = await ProtocolTransformer.transformRequest(
                protocol,
                request,
                conversationId,
                { requestTemplate: binding.requestTemplate, model: binding.model }
            );

            // 2. Execute Request
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (binding.authType === 'bearer' && binding.authKey) {
                headers['Authorization'] = `Bearer ${binding.authKey}`;
            }
            if (binding.customHeaders) {
                Object.assign(headers, binding.customHeaders);
            }

            const res = await fetch(binding.targetUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(transformedRequest)
            });

            if (!res.body) {
                throw new Error('Response body is null');
            }

            // Check if it's an event stream
            const contentType = res.headers.get('content-type');
            if (contentType?.includes('text/event-stream')) {
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;

                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep the incomplete line in buffer

                        for (const line of lines) {
                            if (line.trim() === '') continue;
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data === '[DONE]') continue;

                                try {
                                    const rawResponse = JSON.parse(data);
                                    const lingzhuMsg = await ProtocolTransformer.transformResponse(
                                        protocol,
                                        rawResponse,
                                        request.message_id,
                                        request.agent_id,
                                        {
                                            responseTemplate: binding.responseTemplate,
                                            finishMatchValue: binding.finishMatchValue
                                        }
                                    );
                                    sendEvent(JSON.stringify(lingzhuMsg));

                                    if (lingzhuMsg.is_finish) {
                                        // We don't close immediately here for streams, we let the stream finish naturally
                                        // or if we want to enforce finish:
                                        // closeStream();
                                        // break; 
                                    }
                                } catch (e) {
                                    console.warn('Failed to parse/transform chunk:', e);
                                }
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                }
                closeStream();
            } else {
                // Non-streaming fallback
                const text = await res.text();
                let rawResponse;
                try {
                    rawResponse = JSON.parse(text);
                } catch {
                    rawResponse = { text_response: text };
                }

                // 3. Transform Response
                const lingzhuMsg = await ProtocolTransformer.transformResponse(
                    protocol,
                    rawResponse,
                    request.message_id,
                    request.agent_id,
                    {
                        responseTemplate: binding.responseTemplate,
                        finishMatchValue: binding.finishMatchValue
                    }
                );

                sendEvent(JSON.stringify(lingzhuMsg));
                closeStream();
            }

        } catch (e) {
            sendEvent(JSON.stringify({ role: 'system', type: 'error', answer: 'Protocol Error: ' + String(e) }));
            closeStream();
        }
    } else {
        sendEvent(JSON.stringify({ error: 'Protocol not supported: ' + binding.targetProtocol }));
        closeStream();
    }
}
