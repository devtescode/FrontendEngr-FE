import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/apiClient";
import {
  getCurrentUser,
  getCurrentUserId,
  getUserToken,
  updateSessionUser,
  type SessionUser,
} from "@/lib/auth";
import { queryKeys } from "@/lib/queryKeys";
import { toErrorMessage } from "@/lib/queryClient";
import { getApiErrorCode } from "@/hooks/useAuthMutations";

/* ============================================================
   TYPES
   ============================================================ */

export type Profile = SessionUser;

type RawProfileUser = {
  id?: string;
  _id?: string;
  userId?: string;
  fullName?: string;
  email?: string;
  matric?: string;
  phoneNumber?: string;
  gender?: string;
  role?: string;
  profileImageUrl?: string | null;
};

export type ProfileResponse = {
  success?: boolean;
  user?: RawProfileUser;
};

export type UploadProfileImageResponse = {
  success?: boolean;
  message?: string;
  profileImageUrl?: string;
  user?: RawProfileUser;
};

export const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PROFILE_IMAGE_ACCEPT = PROFILE_IMAGE_TYPES.join(",");
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/* ============================================================
   HELPERS
   ============================================================ */

function toProfile(raw: RawProfileUser | undefined, fallback: Profile | null): Profile {
  const source = raw ?? {};

  return {
    id: String(source.id ?? source._id ?? source.userId ?? fallback?.id ?? ""),
    fullName: source.fullName ?? fallback?.fullName ?? "",
    email: source.email ?? fallback?.email ?? "",
    matric: source.matric ?? fallback?.matric ?? "",
    phoneNumber: source.phoneNumber ?? fallback?.phoneNumber,
    gender: source.gender ?? fallback?.gender,
    role: (source.role ?? fallback?.role) === "admin" ? "admin" : "student",
    profileImageUrl:
      typeof source.profileImageUrl === "string" && source.profileImageUrl
        ? source.profileImageUrl
        : undefined,
  };
}

/**
 * Client-side pre-check so the user gets instant feedback. The server
 * enforces the same rules; this is never the only line of defence.
 * Returns an error message, or null when the file is acceptable.
 */
export function validateProfileImage(file: File): string | null {
  if (!(PROFILE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Please choose a JPEG, PNG or WebP image.";
  }

  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return "That image is larger than 5 MB. Please choose a smaller one.";
  }

  return null;
}

export function profileImageErrorMessage(error: unknown): string {
  switch (getApiErrorCode(error)) {
    case "IMAGE_TOO_LARGE":
      return "That image is larger than 5 MB. Please choose a smaller one.";
    case "INVALID_IMAGE":
      return "Please choose a JPEG, PNG or WebP image.";
    case "RATE_LIMITED":
      return "You've changed your photo too many times. Please try again later.";
    default:
      return toErrorMessage(error, "We couldn't upload your photo. Please try again.");
  }
}

/* ============================================================
   QUERY
   ============================================================ */

export function useProfile() {
  const userId = getCurrentUserId() ?? "";
  const token = getUserToken();
  const sessionUser = getCurrentUser();

  return useQuery({
    queryKey: queryKeys.profile.me(userId),
    queryFn: async ({ signal }): Promise<Profile> => {
      const response = await apiRequest<ProfileResponse>("/engineering/profile", {
        auth: "user",
        signal,
      });

      const current = getCurrentUser();
      const profile = toProfile(response?.user, current);

      // Keep the session copy in step with the server so the photo
      // survives a refresh even if it was changed elsewhere.
      if (current && current.profileImageUrl !== profile.profileImageUrl) {
        updateSessionUser({ profileImageUrl: profile.profileImageUrl });
      }

      return profile;
    },
    initialData: sessionUser ?? undefined,
    // Session data is a snapshot from login — always confirm with the server.
    initialDataUpdatedAt: 0,
    enabled: Boolean(token) && Boolean(userId),
  });
}

/* ============================================================
   MUTATION
   ============================================================ */

export function useUploadProfileImage() {
  const queryClient = useQueryClient();

  return useMutation<
    UploadProfileImageResponse & { profile: Profile; userId: string | null },
    Error,
    File
  >({
    mutationFn: async (file) => {
      // The account that started the upload — it may change before it finishes.
      const userId = getCurrentUserId();
      const invalid = validateProfileImage(file);

      if (invalid) throw new Error(invalid);

      const body = new FormData();
      body.append("image", file);

      // No Content-Type header: the browser adds the multipart boundary.
      const response = await apiRequest<UploadProfileImageResponse>("/engineering/profile-image", {
        method: "POST",
        auth: "user",
        body,
        timeoutMs: 60_000,
      });

      const profile = toProfile(response?.user, getCurrentUser());

      if (!profile.profileImageUrl && response?.profileImageUrl) {
        profile.profileImageUrl = response.profileImageUrl;
      }

      if (!profile.profileImageUrl) {
        throw new Error("The server did not return your new photo.");
      }

      return { ...response, profile, userId };
    },
    onSuccess: ({ profile, userId }) => {
      // Signed out or switched accounts mid-upload: leave the new session alone.
      if (!userId || getCurrentUserId() !== userId) return;

      queryClient.setQueryData(queryKeys.profile.me(userId), profile);
      updateSessionUser({ profileImageUrl: profile.profileImageUrl });

      // A concurrent upload from another tab may have replaced this one.
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.me(userId) });

      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}
