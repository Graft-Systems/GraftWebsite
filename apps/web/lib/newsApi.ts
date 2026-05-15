"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

export type NewsAuthor = {
  id: string;
  email: string;
  name: string;
};

export type NewsArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  status: "draft" | "published";
  author: NewsAuthor;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NewsroomMe = {
  authenticated: boolean;
  can_publish: boolean;
  can_manage_permissions: boolean;
  is_bootstrap_admin: boolean;
  user: NewsAuthor | null;
};

export type NewsroomPublisher = {
  id: string;
  user: NewsAuthor;
  can_publish: boolean;
  can_manage_permissions: boolean;
  granted_by: NewsAuthor | null;
  created_at: string;
  updated_at: string;
};

export function useAuthedNewsFetch() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  return useCallback(async (path: string, init?: RequestInit) => {
    const token = await getTokenRef.current();
    return fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, []);
}

export async function formatNewsHttpError(res: Response): Promise<string> {
  const code = res.status;
  let snippet = "";
  try {
    const data: unknown = await res.json();
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      if (typeof d.detail === "string") snippet = d.detail;
      else if (typeof d.email === "string") snippet = d.email;
      else if (d.email && typeof d.email === "object") {
        const emailErr = d.email as Record<string, unknown>;
        if (typeof emailErr[0] === "string") snippet = emailErr[0];
      }
    }
  } catch {
    /* ignore */
  }
  return snippet ? `${code}: ${snippet}` : `${code}: Request failed.`;
}

export function formatArticleDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function useNewsroomMe() {
  const { isSignedIn } = useAuth();
  const authedFetch = useAuthedNewsFetch();
  const [me, setMe] = useState<NewsroomMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = isSignedIn
        ? await authedFetch("/api/news/me")
        : await fetch("/api/news/me");
      if (!res.ok) {
        setMe(null);
        setError(await formatNewsHttpError(res));
        return;
      }
      setMe((await res.json()) as NewsroomMe);
    } catch (e) {
      setMe(null);
      setError(e instanceof Error ? e.message : "Could not load newsroom access.");
    } finally {
      setLoading(false);
    }
  }, [authedFetch, isSignedIn]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { me, loading, error, reload, authedFetch };
}
