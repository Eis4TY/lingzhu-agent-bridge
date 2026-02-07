import { LingzhuRequest, LingzhuMessage } from '@/protocols/types';
import { substituteTemplate } from '@/services/utils';

export class ProtocolTransformer {
    static async transformRequest(
        targetProtocol: string,
        request: LingzhuRequest,
        conversationId: string,
        config?: { requestTemplate?: string; model?: string }
    ): Promise<unknown> {
        if (targetProtocol === 'custom') {
            if (!config?.requestTemplate) {
                throw new Error('Request template required for custom protocol');
            }
            return substituteTemplate(config.requestTemplate, request);
        } else if (targetProtocol === 'openai') {
            if (config?.requestTemplate) {
                return substituteTemplate(config.requestTemplate, request);
            }
            return {
                model: config?.model || "gpt-3.5-turbo",
                messages: request.message.map(m => ({
                    role: m.role,
                    content: m.text
                })),
                stream: true
            };
        }
        throw new Error(`Protocol ${targetProtocol} not supported for request transformation`);
    }

    static async transformResponse(
        targetProtocol: string,
        response: unknown,
        originalMessageId: string,
        agentId: string,
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
        } else if (targetProtocol === 'openai') {
            if (config?.responseTemplate) {
                const result = substituteTemplate(config.responseTemplate, response);
                mapped = result as Partial<LingzhuMessage>;
                rawIsFinish = (result as any).is_finish;
            } else {
                const resp = response as any;
                const choice = resp?.choices?.[0];
                const content =
                    choice?.delta?.content ??
                    choice?.message?.content ??
                    choice?.text ??
                    resp?.text_response ??
                    "";
                mapped = {
                    answer: content
                };
                rawIsFinish =
                    choice?.finish_reason ??
                    resp?.finish_reason ??
                    false;
            }
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
            agent_id: agentId,
            is_finish: finalIsFinish
        };
    }
}
