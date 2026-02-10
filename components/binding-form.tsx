"use client"

import * as React from "react"
import { ProtocolBinding } from "@/services/binding"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import { Trash2, Copy } from "lucide-react"
interface BindingFormProps {
    initialData?: Partial<ProtocolBinding>
    onSubmit: (data: Partial<ProtocolBinding>) => void
    onCancel: () => void
}

export function BindingForm({ initialData, onSubmit, onCancel }: BindingFormProps) {
    const [formData, setFormData] = React.useState<Partial<ProtocolBinding>>(
        initialData || {
            name: "",
            targetUrl: "",
            targetProtocol: "openai",
            authType: "bearer",
            authKey: "",
            model: "",
            enabled: true,
        }
    )

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSwitchChange = (checked: boolean) => {
        setFormData((prev) => ({ ...prev, enabled: checked }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-[80vh]">
            <div className="flex-1 overflow-y-auto overflow-x-visible px-1 pr-2 space-y-4">
                <div className="grid w-full gap-1.5">
                    <Label htmlFor="name">Friendly Name</Label>
                    <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="My Agent"
                        required
                    />
                </div>

                <div className="grid w-full gap-1.5">
                    <Label htmlFor="targetProtocol">Protocol</Label>
                    <select
                        id="targetProtocol"
                        name="targetProtocol"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.targetProtocol}
                        onChange={handleChange}
                    >
                        <option value="openai">OpenAI (HTTP)</option>
                        <option value="custom">Custom (HTTP)</option>
                    </select>
                </div>

                {formData.targetProtocol === "custom" && (
                    <>
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="requestTemplate">Request Mapping (JSON Template)</Label>
                            <div className="text-xs text-muted-foreground space-y-2">
                                <p>通过 {'{{path}}'} 提取 Rokid Rizon 灵珠智能体开发平台 字段。</p>
                                <div className="bg-muted p-2 rounded-md font-mono text-[10px] whitespace-pre-wrap">
                                    {`// 常用变量:
// {{message.0.text}} - 用户发送的文本
// {{message.0.image_url}} - 图片链接 (如有)
// {{model}} - 模型名称
// {{stream}} -流式 boolean

// 请求示例:
{
  "model": "llama3",
  "prompt": "{{message.0.text}}",
  "image": "{{message.0.image_url}}",
  "stream": true
}`}
                                </div>
                            </div>
                            <textarea
                                id="requestTemplate"
                                name="requestTemplate"
                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.requestTemplate || ""}
                                onChange={(e) => setFormData(prev => ({ ...prev, requestTemplate: e.target.value }))}
                                placeholder='{"prompt": "{{message.0.text}}", "stream": true}'
                            />
                        </div>
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="responseTemplate">Response Mapping (JSON Template)</Label>
                            <div className="text-xs text-muted-foreground space-y-2">
                                <p>提取 API 响应字段。</p>
                                <div className="bg-muted p-2 rounded-md font-mono text-[10px] whitespace-pre-wrap">
                                    {`// Rokid Rizon 灵珠智能体开发平台 目标字段:
// "answer" (必填) - 回复文本
// "is_finish" (选填) - 结束状态

// 响应示例:
{
  "answer": "{{data.text}}",
  "is_finish": "{{data.finished}}"
}`}
                                </div>
                            </div>
                            <textarea
                                id="responseTemplate"
                                name="responseTemplate"
                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.responseTemplate || ""}
                                onChange={(e) => setFormData(prev => ({ ...prev, responseTemplate: e.target.value }))}
                                placeholder='{"answer": "{{response.field}}", "is_finish": "{{response.status}}"}'
                            />
                        </div>
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="finishMatchValue">Finish Match Value (Optional)</Label>
                            <p className="text-[10px] text-muted-foreground">
                                若 &apos;is_finish&apos; 字段等于该值 (如 &quot;stop&quot;) 则结束。留空则按 boolean 判断。
                            </p>
                            <Input
                                id="finishMatchValue"
                                name="finishMatchValue"
                                value={formData.finishMatchValue || ""}
                                onChange={handleChange}
                                placeholder='e.g. stop'
                            />
                        </div>
                    </>
                )}

                {formData.targetProtocol === "custom" && (
                    <div className="grid w-full gap-2">
                        <Label>HTTP Headers</Label>
                        <div className="space-y-2">
                            {Object.entries(formData.customHeaders || {}).map(([key, value], index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <Input
                                        placeholder="Header Key"
                                        value={key}
                                        onChange={(e) => {
                                            const newHeaders = { ...formData.customHeaders };
                                            const newKey = e.target.value;
                                            delete newHeaders[key];
                                            newHeaders[newKey] = value;
                                            setFormData(prev => ({ ...prev, customHeaders: newHeaders }));
                                        }}
                                        className="flex-1"
                                    />
                                    <Input
                                        placeholder="Value"
                                        value={value}
                                        onChange={(e) => {
                                            const newHeaders = { ...formData.customHeaders };
                                            newHeaders[key] = e.target.value;
                                            setFormData(prev => ({ ...prev, customHeaders: newHeaders }));
                                        }}
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => {
                                            const newHeaders = { ...formData.customHeaders };
                                            delete newHeaders[key];
                                            setFormData(prev => ({ ...prev, customHeaders: newHeaders }));
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setFormData(prev => ({
                                        ...prev,
                                        customHeaders: { ...prev.customHeaders, "": "" }
                                    }));
                                }}
                            >
                                Add Header
                            </Button>
                        </div>
                    </div>
                )}



                <div className="grid w-full gap-1.5">
                    <Label htmlFor="targetUrl">Target URL</Label>
                    <Input
                        id="targetUrl"
                        name="targetUrl"
                        value={formData.targetUrl}
                        onChange={handleChange}
                        placeholder="wss://api.example.com/..."
                        required
                    />
                </div>

                {formData.targetProtocol !== "custom" && (
                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="authKey">Auth Key (Bearer Token)</Label>
                        <Input
                            id="authKey"
                            name="authKey"
                            value={formData.authKey}
                            onChange={handleChange}
                            type="password"
                            placeholder="sk-..."
                        />
                    </div>
                )}

                <div className="flex items-center space-x-2">
                    <Switch
                        id="enabled"
                        checked={formData.enabled}
                        onCheckedChange={handleSwitchChange}
                    />
                    <Label htmlFor="enabled">Enabled</Label>
                </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" type="button" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit">Save Binding</Button>
            </div>
        </form>
    )
}
