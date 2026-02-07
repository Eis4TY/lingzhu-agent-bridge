import { NextRequest, NextResponse } from 'next/server';
import { getBinding } from '@/services/binding';


export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const binding = await getBinding(params.id);

    if (!binding) {
        return NextResponse.json({ error: 'Binding not found' }, { status: 404 });
    }

    const startTime = Date.now();


}
