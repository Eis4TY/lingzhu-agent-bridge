import { LingzhuRequest, LingzhuMessage, AutoGLMRequest } from '@/protocols/types';
import { substituteTemplate } from '@/services/utils';

export class ProtocolTransformer {
    static async transformRequest(
        targetProtocol: string,
        request: LingzhuRequest,
        conversationId: string,
        config?: { requestTemplate?: string }
    ): Promise<unknown> {
        if (targetProtocol === 'custom') {
            if (!config?.requestTemplate) {
                throw new Error('Request template required for custom protocol');
            }
            return substituteTemplate(config.requestTemplate, request);
        } else if (targetProtocol === 'autoglm') {
            const userMessage = request.message.find(m => m.role === 'user');
            if (!userMessage) throw new Error('No user message found');

            const payload: AutoGLMRequest = {
                timestamp: Date.now(),
                conversation_id: conversationId,
                msg_type: 'client_test',
                msg_id: request.message_id || crypto.randomUUID(),
                data: {
                    biz_type: 'test_agent',
                    instruction: userMessage.text
                }
            };
            return payload;
        }
        throw new Error(`Protocol ${targetProtocol} not supported for request transformation`);
    }

    static async transformResponse(
        targetProtocol: string,
        response: unknown,
        originalMessageId: string,
        config?: { responseTemplate?: string; finishMatchValue?: string }
    ): Promise<LingzhuMessage> {
        let mapped: Partial<LingzhuMessage> = {};
        // Extra prop to hold raw is_finish from template for comparison
        let rawIsFinish: any = false;

        if (targetProtocol === 'custom') {
            if (!config?.responseTemplate) {
                mapped = {
                    answer: JSON.stringify(response),
                    is_finish: true
                };
                rawIsFinish = true;
            } else {
                const result = substituteTemplate(config.responseTemplate, response);
                mapped = result as Partial<LingzhuMessage>;
                // If the template mapped is_finish, capture it potentially as string
                rawIsFinish = (result as any).is_finish;
            }
        } else if (targetProtocol === 'autoglm') {
            // ... existing autoglm logic
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res = response as any;
            const isFinish = res.status === 'completed' || res.status === 'failed';
            mapped = {
                is_finish: isFinish,
                answer: typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
                answer_stream: typeof res.data === 'string' ? res.data : undefined
            };
            rawIsFinish = isFinish;
        } else {
            throw new Error(`Protocol ${targetProtocol} not supported for response transformation`);
        }

        // Determine final is_finish boolean
        let finalIsFinish = false;
        if (config?.finishMatchValue) {
            // If a match value is provided, strict string comparison (or loose if you prefer, but usually strict)
            // Let's coerce both to string to be safe
            finalIsFinish = String(rawIsFinish) === config.finishMatchValue;
        } else {
            // Default boolean coercion
            finalIsFinish = !!rawIsFinish;
        }

        // Strict Lingzhu Response Format
        return {
            role: 'agent',
            type: 'answer',
            answer_stream: mapped.answer_stream || mapped.answer || "",
            message_id: originalMessageId, // Must match request message_id
            is_finish: finalIsFinish
        };
    }
}
