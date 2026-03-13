import {
  buildMAFaceRequestBody,
  buildMATabularFaceUrl,
  getApiBaseUrl,
} from "@/lib/ma-api/constants";
import type { MAApiFilterParams, MAApiResponse } from "@/types/ma-api";

export async function fetchMAFaceTabularData(
  accessToken: string,
  filters?: MAApiFilterParams
): Promise<MAApiResponse> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_KPI or NEXT_PUBLIC_API_ROOT is not set");
  }

  const url = buildMATabularFaceUrl(baseUrl);
  const body = buildMAFaceRequestBody(filters);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }

  const json: MAApiResponse = await response.json();
  if (json.error) {
    throw new Error(json.error);
  }

  return json;
}
