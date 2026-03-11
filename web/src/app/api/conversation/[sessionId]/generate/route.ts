/**
 * 对话模式内容生成 API - 代理到后端服务
 */

import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    console.log('[API Route] Generate request for sessionId:', sessionId);

    // 调用真实后端服务
    const backendUrl = `${API_URL}/api/conversation/${sessionId}/generate`;
    console.log('[API Route] Calling backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    console.log('[API Route] Backend response status:', response.status);

    const result = await response.json();
    console.log('[API Route] Backend response:', { success: result.success, error: result.error });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API Route] Generate error:', error);
    return NextResponse.json(
      { success: false, error: '后端服务不可用，请确保运行：npm run server' },
      { status: 500 }
    );
  }
}
