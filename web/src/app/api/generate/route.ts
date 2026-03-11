/**
 * 内容生成 API - 调用真实后端服务
 */

import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // 调用真实后端服务
    const response = await fetch(`${API_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { success: false, error: '后端服务不可用，请确保运行：npm run server' },
      { status: 500 }
    );
  }
}