export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "viewer";
  status?: string;
  created_at?: string;
  last_login?: string | null;
};

type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function requireApiUrl() {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  return API_URL;
}

async function readError(response: Response) {
  try {
    const body = await response.json();
    return body.detail || body.message || "Request failed";
  } catch {
    return "Request failed";
  }
}

export async function login(
  email: string,
  password: string,
  rememberMe: boolean = false,
) {
  void rememberMe;

  const response = await fetch(`${requireApiUrl()}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const data = (await response.json()) as AuthResponse;
  localStorage.setItem("nexus_token", data.access_token);
  localStorage.setItem("nexus_user", JSON.stringify(data.user));

  return {
    token: data.access_token,
    user: data.user,
  };
}

export async function logout() {
  const token = getToken();

  try {
    if (token) {
      await fetch(`${requireApiUrl()}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } finally {
    localStorage.removeItem("nexus_token");
    localStorage.removeItem("nexus_user");
    window.location.assign("/login");
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("nexus_token");
}

export function getUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawUser = localStorage.getItem("nexus_user");
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as User;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export function isAdmin(): boolean {
  const user = getUser();
  return user?.role === "admin";
}
