import { getBinding } from '@/services/binding';
import { AutoGLMClient } from '@/protocols/autoglm';
import { LingzhuRequest, LingzhuMessage } from '@/protocols/types';
import { ProtocolTransformer } from './transformer';


const activeClients: Map<string, AutoGLMClient> = new Map();

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

    if (binding.targetProtocol === 'autoglm') {
        let client = activeClients.get(agentId);
        if (!client) {
            if (!binding.targetUrl || !binding.authKey) {
                sendEvent(JSON.stringify({ error: 'Missing AutoGLM configuration' }));
                closeStream();
                return;
            }
            client = new AutoGLMClient(binding.targetUrl, binding.authKey);
            client.connect();
            activeClients.set(agentId, client);
        }

        const conversationId = crypto.randomUUID();

        // Setup listener for this request
        const messageHandler = async (msg: any) => {
            try {
                const lingzhuMsg = await ProtocolTransformer.transformResponse('autoglm', msg, request.message_id, {
                    finishMatchValue: binding.finishMatchValue
                });
                sendEvent(JSON.stringify(lingzhuMsg));

                if (lingzhuMsg.is_finish) {
                    client?.off('message', messageHandler);
                    closeStream();
                }
            } catch (e) {
                console.error('Transformation error:', e);
            }
        };

        client.on('message', messageHandler);

        // Send instruction
        const sendFn = async () => {
            if (client) {
                try {
                    const payload = await ProtocolTransformer.transformRequest('autoglm', request, conversationId);
                    // AutoGLM Client currently takes instruction string, we might need to update it to take full payload 
                    // or just extract instruction here for now to keep client simple, 
                    // BUT for Sandbox we need the full payload. 
                    // Let's adjust AutoGLMClient to accept payload or keep it specific?
                    // For now, let's keep the client method simple but use the transformer to "verify" or "generate" the structure if needed.
                    // Actually, to make Sandbox useful, we want to see the JSON.
                    // So we should probably update AutoGLMClient to send a generic JSON payload if we want full flexibility.
                    // But strictly following current abstraction:

                    // Re-extract instruction from payload for the specific client definition
                    const instruction = (payload as any).data.instruction;
                    client.sendInstruction(instruction, conversationId);
                } catch (e) {
                    sendEvent(JSON.stringify({ role: 'system', type: 'error', answer: 'Failed to transform/send request: ' + String(e) }));
                    closeStream();
                }
            }
        };

        if (client.isConnected) {
            sendFn();
        } else {
            client.once('open', sendFn);
            client.once('error', (err) => {
                sendEvent(JSON.stringify({ role: 'system', type: 'error', answer: String(err) }));
                closeStream();
            });
        }

        // Safety timeout
        setTimeout(() => {
            client?.off('message', messageHandler);
            // closeStream(); // Don't close strictly, maybe long running
        }, 60000);


    } else if (binding.targetProtocol === 'custom') {
        try {
            const conversationId = crypto.randomUUID();
            // 1. Transform Request
            const transformedRequest = await ProtocolTransformer.transformRequest(
                'custom',
                request,
                conversationId,
                { requestTemplate: binding.requestTemplate }
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

            // For Bridge API, we buffer the response to transform it to Lingzhu format
            // We can't easily stream "Raw Chunks" -> "Lingzhu Objects" yet without a complex stream transformer.
            const text = await res.text();
            let rawResponse;
            try {
                rawResponse = JSON.parse(text);
            } catch {
                rawResponse = { text_response: text };
            }

            // 3. Transform Response
            const lingzhuMsg = await ProtocolTransformer.transformResponse(
                'custom',
                rawResponse,
                request.message_id,
                {
                    responseTemplate: binding.responseTemplate,
                    finishMatchValue: binding.finishMatchValue
                }
            );

            sendEvent(JSON.stringify(lingzhuMsg));
            closeStream();

        } catch (e) {
            sendEvent(JSON.stringify({ role: 'system', type: 'error', answer: 'Custom Protocol Error: ' + String(e) }));
            closeStream();
        }
    } else {
        sendEvent(JSON.stringify({ error: 'Protocol not supported: ' + binding.targetProtocol }));
        closeStream();
    }
}
