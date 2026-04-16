import { API_BASE } from "./constants";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

export type SubmitReviewPayload = {
  session_id: string;
  step: number;
  answer: string;
};

export async function fetchProperties() {
  return apiFetch(`/api/properties`);
}

export async function getProperties() {
  return fetchProperties();
}

export async function getProperty(propertyId: string) {
  return apiFetch(`/api/property/${encodeURIComponent(propertyId)}`);
}

export async function getPropertyDashboard(propertyId: string) {
  return apiFetch(`/api/property/${encodeURIComponent(propertyId)}/dashboard`);
}

export async function startReview(propertyId: string, existingSessionId?: string) {
  const qs = existingSessionId
    ? `?existing_session_id=${encodeURIComponent(existingSessionId)}`
    : "";
  return apiFetch(`/api/review/start/${encodeURIComponent(propertyId)}${qs}`);
}

export async function getReviewSession(sessionId: string) {
  return apiFetch(`/api/review/session/${encodeURIComponent(sessionId)}`);
}

export async function submitReview(propertyId: string, body: SubmitReviewPayload) {
  return apiFetch(`/api/review/submit/${encodeURIComponent(propertyId)}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getReviewDashboard(sessionId: string) {
  return apiFetch(`/api/review/dashboard/${encodeURIComponent(sessionId)}`);
}

export async function getDashboard(sessionId: string) {
  return getReviewDashboard(sessionId);
}

export async function getImprovePrompt(propertyId: string, existingSessionId?: string) {
  const qs = existingSessionId
    ? `?existing_session_id=${encodeURIComponent(existingSessionId)}`
    : "";
  return apiFetch(`/api/improve/${encodeURIComponent(propertyId)}${qs}`);
}

export const Api = {
  getProperties,
  fetchProperties,
  getProperty,
  getPropertyDashboard,
  startReview,
  getReviewSession,
  submitReview,
  getReviewDashboard,
  getDashboard,
  getImprovePrompt,
};

export default Api;