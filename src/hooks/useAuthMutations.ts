import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/apiClient";
import {
  clearAdminSession,
  clearUserSession,
  getUserToken,
  setAdminSession,
  setUserSession,
  type SessionAdmin,
  type SessionUser,
} from "@/lib/auth";
import { queryKeys } from "@/lib/queryKeys";

/* ============================================================
   USER LOGIN
   ============================================================ */

export type UserLoginResponse = {
  message?: string;
  token: string;
  user: {
    id?: string;
    _id?: string;
    userId?: string;
    fullName?: string;
    email?: string;
    matric?: string;
    phoneNumber?: string;
    gender?: string;
    role?: string;
  };
};

export function useUserLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      email: string;
      password: string;
    }): Promise<UserLoginResponse> => {
      const response = await apiRequest<UserLoginResponse>(
        "/engineering/userlogin",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: variables.email.trim(),
            password: variables.password,
          }),
        }
      );

      if (!response?.token) {
        throw new Error("Server did not return an authentication token.");
      }

      const raw = response.user ?? ({} as UserLoginResponse["user"]);
      const id = String(raw.id ?? raw._id ?? raw.userId ?? "");

      if (!id) {
        throw new Error("Server did not return user information.");
      }

      const user: SessionUser = {
        id,
        fullName: raw.fullName ?? "",
        email: raw.email ?? variables.email.trim(),
        matric: raw.matric ?? "",
        phoneNumber: raw.phoneNumber,
        gender: raw.gender,
        role: raw.role === "admin" ? "admin" : "student",
      };

      // Any cached data belongs to the previous account.
      queryClient.clear();

      setUserSession(user, response.token);

      return { ...response, user: user as any };
    },
  });
}

/* ============================================================
   USER REGISTRATION
   ============================================================ */

export type RegisterVariables = {
  fullName: string;
  email: string;
  matric: string;
  phoneNumber: string;
  gender: string;
  password: string;
};

export function useUserRegister() {
  return useMutation({
    mutationFn: async (
      variables: RegisterVariables
    ): Promise<{ success?: boolean; message?: string }> => {
      return apiRequest("/engineering/usersignup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: variables.fullName.trim(),
          email: variables.email.trim(),
          matric: variables.matric.trim(),
          phoneNumber: variables.phoneNumber.trim(),
          gender: variables.gender,
          password: variables.password,
        }),
      });
    },
  });
}

/* ============================================================
   ADMIN LOGIN / REGISTRATION
   ============================================================ */

export type AdminLoginResponse = {
  message?: string;
  token: string;
  admin: SessionAdmin;
};

export function useAdminLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      email: string;
      password: string;
    }): Promise<AdminLoginResponse> => {
      const response = await apiRequest<AdminLoginResponse>("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: variables.email.trim(),
          password: variables.password,
        }),
      });

      if (!response?.token) {
        throw new Error("Server did not return an authentication token.");
      }

      if (!response.admin) {
        throw new Error("Server did not return admin information.");
      }

      const admin: SessionAdmin = {
        ...response.admin,
        role: "admin",
      };

      queryClient.clear();

      setAdminSession(admin, response.token);

      return { ...response, admin };
    },
  });
}

export function useAdminRegister() {
  return useMutation({
    mutationFn: async (variables: {
      username: string;
      email: string;
      password: string;
    }) => {
      return apiRequest("/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: variables.username.trim(),
          email: variables.email.trim(),
          password: variables.password,
        }),
      });
    },
  });
}

export function useAdminExists() {
  return useMutation({
    mutationFn: async (): Promise<boolean> => {
      const response = await apiRequest<{ exists?: boolean }>(
        "/admin/exists"
      );

      return Boolean(response?.exists);
    },
  });
}

/* ============================================================
   PASSWORD CHANGE
   ============================================================ */

export function useChangePassword() {
  return useMutation({
    mutationFn: async (variables: {
      currentPassword: string;
      newPassword: string;
    }) => {
      return apiRequest("/engineering/changepassword", {
        method: "POST",
        auth: "user",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: variables.currentPassword,
          newPassword: variables.newPassword,
        }),
      });
    },
  });
}

/* ============================================================
   PASSWORD RECOVERY
   ============================================================ */

export type PasswordRecoveryResponse = {
  success?: boolean;
  message?: string;
  code?: "TOKEN_INVALID" | "TOKEN_EXPIRED";
};

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (variables: {
      email: string;
    }): Promise<PasswordRecoveryResponse> => {
      return apiRequest("/engineering/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: variables.email.trim() }),
        // The backend waits on the email provider before answering.
        timeoutMs: 30_000,
      });
    },
  });
}

/**
 * Checks a reset link without consuming it. The token is only
 * ever held in memory — never written to storage.
 */
export function useValidateResetToken(token: string) {
  return useQuery({
    queryKey: ["password-reset", "validate", token],
    queryFn: ({ signal }) =>
      apiRequest<PasswordRecoveryResponse>(
        `/engineering/reset-password/${encodeURIComponent(token)}`,
        { signal }
      ),
    enabled: Boolean(token),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (variables: {
      token: string;
      password: string;
      confirmPassword: string;
    }): Promise<PasswordRecoveryResponse> => {
      return apiRequest(
        `/engineering/reset-password/${encodeURIComponent(variables.token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: variables.password,
            confirmPassword: variables.confirmPassword,
          }),
        }
      );
    },
  });
}

/* ============================================================
   PAYMENT VERIFICATION
   ============================================================ */

export function useVerifyPayment() {
  return useMutation({
    mutationFn: async ({
      reference,
    }: {
      reference: string;
    }): Promise<{ status?: string; message?: string; reference?: string }> => {
      return apiRequest("/api/paystack/verify", {
        auth: "user",
        query: { reference },
      });
    },
  });
}

/* ============================================================
   SESSION HELPERS
   ============================================================ */

export function signOutUser(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.clear();
  clearUserSession();
}

export function signOutAdmin(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.clear();
  clearAdminSession();
}

/**
 * The cart badge and the payment flow both need to know whether a
 * student session exists without waiting for the first render.
 */
export function hasUserSession(): boolean {
  return Boolean(getUserToken());
}

export { queryKeys };
