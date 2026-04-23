import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/authToken";

function buildLogoutResponse() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return response;
}

export async function POST() {
  return buildLogoutResponse();
}

export async function DELETE() {
  return buildLogoutResponse();
}
