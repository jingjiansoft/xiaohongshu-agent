import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const CONFIG_PATH = resolve(process.cwd(), '../config/user-profile.json');
const TEMPLATE_PATH = resolve(process.cwd(), '../config/user-profile.example.json');

export async function GET() {
  try {
    let profile;
    
    if (existsSync(CONFIG_PATH)) {
      const content = readFileSync(CONFIG_PATH, 'utf-8');
      profile = JSON.parse(content);
    } else {
      // 如果配置文件不存在，使用模板
      const content = readFileSync(TEMPLATE_PATH, 'utf-8');
      profile = JSON.parse(content);
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Load config error:', error);
    return NextResponse.json(
      { success: false, error: '加载配置失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { profile } = data;

    if (!profile) {
      return NextResponse.json(
        { success: false, error: '配置数据不能为空' },
        { status: 400 }
      );
    }

    // 更新 metadata
    profile.metadata = {
      ...profile.metadata,
      updatedAt: new Date().toISOString(),
    };

    // 保存到配置文件
    writeFileSync(CONFIG_PATH, JSON.stringify(profile, null, 2), 'utf-8');

    return NextResponse.json({ success: true, message: '配置保存成功' });
  } catch (error) {
    console.error('Save config error:', error);
    return NextResponse.json(
      { success: false, error: '保存配置失败' },
      { status: 500 }
    );
  }
}