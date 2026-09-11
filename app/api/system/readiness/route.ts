import { NextResponse } from 'next/server'

export async function GET(){
  return NextResponse.json({
    supabase:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    posterVision:Boolean(process.env.OPENAI_API_KEY),
    googleCalendar:Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET),
  })
}
