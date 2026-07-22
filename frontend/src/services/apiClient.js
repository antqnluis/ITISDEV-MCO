const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:9999";

export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function parseResponse(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

export async function apiRequest(path, { body, method = "GET", token } = {}) {
  const headers = { Accept: "application/json" };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Unable to reach the AnimoLog server. Please try again.");
  }

  let data;
  try {
    data = await parseResponse(response);
  } catch {
    throw new ApiError("The server returned an unreadable response.", response.status);
  }

  if (!response.ok) {
    throw new ApiError(data?.message || "The request could not be completed.", response.status, data);
  }

  return data;
}
