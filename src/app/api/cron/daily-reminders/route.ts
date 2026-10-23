import { NextResponse } from 'next/server';

export async function GET() {
  // Cron jobs and push notifications are handled centrally on the Railway backend API
  return NextResponse.json({ 
    success: true, 
    message: 'Daily reminder cron managed by central backend API.' 
  });
}
