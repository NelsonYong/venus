import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 检查当前时间戳，确保服务正在运行
    const timestamp = new Date().toISOString();

    // 可以在这里添加更多的健康检查，比如数据库连接等
    // 但根据需求，这里只是简单检查服务是否启动

    return NextResponse.json({
      status: 'healthy',
      message: 'Service is running normally',
      timestamp,
      uptime: process.uptime(), // 服务运行时间（秒）
    }, { status: 200 });

  } catch (error) {
    // 如果出现任何错误，返回不健康状态
    return NextResponse.json({
      status: 'unhealthy',
      message: 'Service exception',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
