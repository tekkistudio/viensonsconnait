// src/app/api/bictorys/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_BICTORYS_API_URL;
    const apiKey = process.env.NEXT_PUBLIC_BICTORYS_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Bictorys API configuration missing' },
        { status: 500 }
      );
    }

    const path = params.path.join('/');
    const url = `${apiUrl}/${path}`;

    const response = await fetch(url, {
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Bictorys proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to Bictorys' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_BICTORYS_API_URL;
    const apiKey = process.env.NEXT_PUBLIC_BICTORYS_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Bictorys API configuration missing' },
        { status: 500 }
      );
    }

    const path = params.path.join('/');
    const url = `${apiUrl}/${path}`;
    const body = await request.json();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Bictorys proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to Bictorys' },
      { status: 500 }
    );
  }
}