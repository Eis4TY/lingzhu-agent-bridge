import { NextRequest, NextResponse } from 'next/server';
import { getBindings, saveBinding, ProtocolBinding } from '@/services/binding';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    const bindings = getBindings();
    return NextResponse.json(bindings);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const newBinding: ProtocolBinding = {
            ...body,
            id: body.id || uuidv4(),
            enabled: body.enabled ?? true,
        };
        saveBinding(newBinding);
        return NextResponse.json(newBinding);
    } catch (e) {
        return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }
}
