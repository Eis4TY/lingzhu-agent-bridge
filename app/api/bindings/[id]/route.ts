import { NextRequest, NextResponse } from 'next/server';
import { getBinding, saveBinding, deleteBinding, ProtocolBinding } from '@/services/binding';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const id = (await params).id;
    const binding = getBinding(id);
    if (!binding) return new NextResponse(null, { status: 404 });
    return NextResponse.json(binding);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const id = (await params).id;
    try {
        const body = await req.json();
        const binding = getBinding(id);
        if (!binding) return new NextResponse(null, { status: 404 });
        const updated = { ...binding, ...body, id }; // Ensure ID match
        saveBinding(updated);
        return NextResponse.json(updated);
    } catch (e) {
        return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const id = (await params).id;
    deleteBinding(id);
    return new NextResponse(null, { status: 204 });
}
