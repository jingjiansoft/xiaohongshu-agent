import { NextRequest, NextResponse } from 'next/server';

// POST /api/login/save - 保存 Cookie 到 SQLite
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cookies } = body;

    if (!cookies || !Array.isArray(cookies)) {
      return NextResponse.json(
        { success: false, message: 'Cookie 数据格式错误' },
        { status: 400 }
      );
    }

    // 调用后端 API 保存到 SQLite
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/api/cookie/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookies }),
    });

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({
        success: true,
        message: 'Cookie 保存成功',
        count: cookies.length,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || '保存失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('保存 Cookie 失败:', error);
    return NextResponse.json(
      { success: false, message: '保存 Cookie 失败：' + (error as Error).message },
      { status: 500 }
    );
  }
}

// GET /api/login/save - 检查 Cookie 状态
export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/api/cookie/status`);
    const data = await response.json();

    return NextResponse.json({
      success: true,
      exists: data.exists || false,
      count: data.count || 0,
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      exists: false,
      count: 0,
    });
  }
}
