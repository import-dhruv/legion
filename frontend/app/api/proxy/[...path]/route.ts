import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = (process.env.API_UPSTREAM_URL ?? "http://localhost:3001").replace(/\/+$/, "");
const TOKEN = process.env.CONTROL_PLANE_TOKEN ?? "";

async function proxy(request: NextRequest, context: { params: { path: string[] } }): Promise<Response> {
  const segments = context.params.path ?? [];
  const target = `${UPSTREAM}/${segments.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("accept-encoding"); // let the runtime re-compress if needed
  if (TOKEN) headers.set("x-control-plane-token", TOKEN);

  const method = request.method.toUpperCase();
  const upstream = await fetch(target, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer(),
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);
  responseHeaders.set("cache-control", "no-store");
  responseHeaders.set("x-accel-buffering", "no"); // SSE: disable proxy buffering

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
