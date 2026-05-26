import { auth } from "@clerk/nextjs/server";

export async function crmFetch(endpoint: string, options: RequestInit = {}) {
  const { getToken } = await auth();
  const token = await getToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Content-Type", "application/json");

  // Use the proxied path
  const url = `/api/crm${endpoint}`;
  
  // For server-side calls, we might need the full URL if not using a proxy aware fetch
  // However, Next.js server actions can usually just fetch from the local origin or the absolute URL
  const baseUrl = process.env.BACKEND_URL || "http://127.0.0.1:8080";
  const absoluteUrl = `${baseUrl}/api/crm${endpoint}`;

  const response = await fetch(absoluteUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
