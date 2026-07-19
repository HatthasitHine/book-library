import { apiRequest } from "./client";
import type { LoginCredentials, LoginResponse } from "./types";

export function loginRequest(credentials: LoginCredentials): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}
