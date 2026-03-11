import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';

const COOKIE_PATH = join(process.cwd(), '..', 'config', 'cookies.json');

// POST /api/login/save - 保存完整 Cookie 到文件
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

    // 确保目录存在
    await mkdir(dirname(COOKIE_PATH), { recursive: true });

    // 保存完整的 Cookie 对象（包含所有属性）
    const cookieData = {
      cookies: cookies.map((cookie: any) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain || '.xiaohongshu.com',
        path: cookie.path || '/',
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || false,
        expires: cookie.expires || -1,
        sameSite: cookie.sameSite || 'Lax',
      })),
      savedAt: new Date().toISOString(),
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    // 保存到文件
    await writeFile(COOKIE_PATH, JSON.stringify(cookieData, null, 2), 'utf-8');

    console.log('✅ Cookie 已保存到:', COOKIE_PATH, '共', cookies.length, '个');

    return NextResponse.json({
      success: true,
      message: 'Cookie 保存成功',
      count: cookies.length,
      path: COOKIE_PATH,
    });
  } catch (error) {
    console.error('保存 Cookie 失败:', error);
    return NextResponse.json(
      { success: false, message: '保存 Cookie 失败：' + (error as Error).message },
      { status: 500 }
    );
  }
}

// GET /api/login/save - 检查 Cookie 文件
export async function GET() {
  try {
    const { readFile } = await import('fs/promises');
    await readFile(COOKIE_PATH, 'utf-8');
    
    return NextResponse.json({
      success: true,
      exists: true,
      path: COOKIE_PATH,
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      exists: false,
      path: COOKIE_PATH,
    });
  }
}
