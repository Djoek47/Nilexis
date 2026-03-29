/**
 * Base URL for the Nelexis API (first Vercel project), e.g. https://your-api.vercel.app
 */
export function getNelexisApiUrl(): string {
  return (process.env.NEXT_PUBLIC_NELEXIS_API_URL ?? "").replace(/\/$/, "");
}

export async function nelexisFetch(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<Response> {
  const base = getNelexisApiUrl();
  if (!base) {
    throw new Error("NEXT_PUBLIC_NELEXIS_API_URL is not set");
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}
