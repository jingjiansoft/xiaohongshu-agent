import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/login/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to initiate login:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to initiate login' },
      { status: 500 }
    );
  }
}
