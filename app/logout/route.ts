import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    revalidatePath("/");
    return NextResponse.redirect(new URL("/login", request.url), { status: 302 });
}
