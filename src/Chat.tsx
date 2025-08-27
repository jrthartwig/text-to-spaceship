import React, { useCallback, useEffect, useRef, useState } from 'react';

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'error';
    content: string;              // original textual content
    meta?: Record<string, any>;   // extra meta (status, ids, etc.)
    parsedJson?: any;             // if assistant content is valid JSON, store parsed value
    jsonOnly?: boolean;           // true if the whole content was JSON (no leading explanatory text)
};

interface ApiResponseShape {
    response: string;
    run_status?: string;
    agent_id?: string;
    thread_id?: string;
}

interface ChatProps {
    endpoint?: string; // optional override
}

const Chat: React.FC<ChatProps> = ({ endpoint }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [threadId, setThreadId] = useState<string | undefined>();
    const [agentId, setAgentId] = useState<string | undefined>();
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);

    const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '';
    const resolvedEndpoint = endpoint || `${API_BASE.replace(/\/$/, '')}/api/structure_agent`;

    // Auto-scroll when messages change
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages]);

    function tryParseJson(raw: string): { parsed?: any, jsonOnly: boolean } {
        const trimmed = raw.trim();
        // Fast path: starts with { or [ and ends with } or ]
        const looksLike = /^(\{[\s\S]*\}|\[[\s\S]*\])$/.test(trimmed);
        if (looksLike) {
            try {
                return { parsed: JSON.parse(trimmed), jsonOnly: true };
            } catch { /* fallthrough */ }
        }
        // Attempt to extract first full JSON object or array if embedded in text
        const firstBrace = trimmed.indexOf('{');
        if (firstBrace !== -1) {
            const lastBrace = trimmed.lastIndexOf('}');
            if (lastBrace > firstBrace) {
                const candidate = trimmed.slice(firstBrace, lastBrace + 1);
                try {
                    return { parsed: JSON.parse(candidate), jsonOnly: candidate === trimmed };
                } catch { /* ignore */ }
            }
        }
        return { jsonOnly: false };
    }

    const sendPrompt = useCallback(async () => {
        const prompt = input.trim();
        if (!prompt || loading) return;
        setInput('');
        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: prompt };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        try {
            const body: any = { prompt };
            if (threadId) body.thread_id = threadId;

            const res = await fetch(resolvedEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as ApiResponseShape;
            if (data.thread_id) setThreadId(data.thread_id);
            if (data.agent_id) setAgentId(data.agent_id);
            const rawContent = data.response || '(No response)';
            const { parsed, jsonOnly } = tryParseJson(rawContent);
            const assistantMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: rawContent,
                parsedJson: parsed,
                jsonOnly,
                meta: { run_status: data.run_status, agent_id: data.agent_id, thread_id: data.thread_id }
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err: any) {
            const errorMsg: ChatMessage = { id: crypto.randomUUID(), role: 'error', content: err.message || String(err) };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
            // Refocus
            textareaRef.current?.focus();
        }
    }, [input, loading, resolvedEndpoint, threadId]);

    const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendPrompt();
        }
    };

    return (
        <div className="flex flex-col h-full max-h-screen">
            <header className="px-4 py-3 border-b border-surface2 flex items-center gap-3 bg-surface/80 backdrop-blur">
                <img src="/NASA-Logo-Large.png" alt="NASA" className="w-10 h-10 object-contain" />
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">Text to Spaceship</h1>
                    <p className="text-xs text-gray-400">Ask anything about space & exploration</p>
                </div>
                <div className="ml-auto flex gap-4 text-[10px] text-gray-500">
                    {agentId && <span>Agent: <code className="text-gray-400">{agentId}</code></span>}
                    {threadId && <span>Thread: <code className="text-gray-400">{threadId}</code></span>}
                </div>
            </header>
            <main className="flex-1 overflow-y-auto px-4 md:px-12 py-6" ref={listRef}>
                <div className="flex flex-col gap-6">
                    {messages.length === 0 && !loading && (
                        <div className="text-left text-sm text-gray-500 pt-10 pl-1">Start the conversation with a question about NASA, missions, or spacecraft.</div>
                    )}
                    {messages.map(m => {
                        const bubbleBase = 'relative max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow';
                        const colorClass = m.role === 'user'
                            ? 'bg-indigo-600 text-white'
                            : m.role === 'assistant'
                                ? 'bg-surface2 border border-surface2/70'
                                : m.role === 'error'
                                    ? 'bg-red-950 border border-red-800 text-red-200'
                                    : 'bg-gray-700';
                        return (
                            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                                <div className={bubbleBase + ' ' + colorClass}>
                                    {/* Content */}
                                    {m.parsedJson ? (
                                        <div className="flex flex-col gap-3">
                                            {!m.jsonOnly && (
                                                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                                            )}
                                            <pre className="bg-black/40 rounded-lg p-3 text-xs md:text-[13px] leading-relaxed overflow-auto border border-white/5">
                                                <code>{JSON.stringify(m.parsedJson, null, 2)}</code>
                                            </pre>
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap break-words">{m.content}</div>
                                    )}
                                    {m.role === 'assistant' && m.meta?.run_status && (
                                        <div className="mt-2 text-[10px] uppercase tracking-wide text-gray-500">Status: {m.meta.run_status}</div>
                                    )}
                                    {m.role === 'error' && (
                                        <div className="mt-2 text-[10px] uppercase tracking-wide text-red-400">Request failed</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-surface2 border border-surface2/70 rounded-2xl px-4 py-3 text-sm opacity-70 animate-pulse">Thinking…</div>
                        </div>
                    )}
                </div>
            </main>
            <form
                onSubmit={e => { e.preventDefault(); sendPrompt(); }}
                className="sticky bottom-0 w-full px-4 md:px-12 pb-6 bg-gradient-to-t from-surface via-surface/95 to-surface/10 backdrop-blur">
                <div className="flex flex-col gap-2">
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            className="w-full resize-none rounded-xl bg-surface2/70 border border-surface2 focus:border-indigo-500 outline-none px-4 py-3 text-sm leading-relaxed text-gray-100 placeholder-gray-500 shadow-inner backdrop-blur min-h-[60px] max-h-[240px]"
                            placeholder="Ask something about space…"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            rows={2}
                        />
                        <div className="absolute right-2 bottom-2 flex items-center gap-2">
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="h-9 px-4 rounded-lg text-sm font-medium bg-indigo-600 enabled:hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white shadow"
                            >
                                {loading ? '…' : 'Send'}
                            </button>
                        </div>
                    </div>
                    <div className="text-[10px] text-gray-500 text-center">Press Enter to send • Shift+Enter for newline</div>
                </div>
            </form>
        </div>
    );
};

export default Chat;
