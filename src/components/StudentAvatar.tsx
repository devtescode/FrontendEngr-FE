import { useEffect, useState } from "react";

/** First letters of up to two words, upper-cased; "?" when there are none. */
export function getInitials(name: string | null | undefined): string {
  const initials = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return initials || "?";
}

type StudentAvatarProps = {
  name: string;
  /** https photo URL; falsy renders the initials fallback */
  imageUrl?: string | null;
  /** box size / rounding / colours of the tile */
  className?: string;
  /** extra classes for the initials text */
  textClassName?: string;
};

/**
 * Student profile photo with an initials fallback, used when there is
 * no photo or it fails to load. The failure state resets whenever the
 * URL changes.
 */
export function StudentAvatar({
  name,
  imageUrl,
  className = "",
  textClassName = "",
}: StudentAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  if (imageUrl && !failed) {
    return (
      <div className={`${className} overflow-hidden`}>
        <img
          src={imageUrl}
          alt={`${name}'s profile picture`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <span className={textClassName || undefined}>{getInitials(name)}</span>
    </div>
  );
}

export default StudentAvatar;
