import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  return NextResponse.json({
    cookies: allCookies.map(c => ({
      name: c.name,
      value: c.value.substring(0, 20) + '...',
      hasValue: !!c.value
    })),
    count: allCookies.length
  });
}
