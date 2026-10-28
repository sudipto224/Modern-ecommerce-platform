"use client";

import { useBusinessProfile } from "@/lib/business-profile";

export default function BusinessFooter() {
  const { profile } = useBusinessProfile();

  return (
    <footer className="border-t border-[#e9ddd5] px-6 py-10 text-center">
      <p className="font-serif text-xl font-semibold">
        {profile.businessName}
      </p>

      {profile.showTagline && profile.tagline && (
        <p className="mt-2 text-sm text-[#80685b]">
          {profile.tagline}
        </p>
      )}
      {(profile.phone || profile.email || profile.address) && (
        <div className="mt-3 space-y-1 text-sm text-[#80685b]">
          {profile.phone && <p>{profile.phone}</p>}
          {profile.email && <p>{profile.email}</p>}
          {profile.address && <p>{profile.address}</p>}
        </div>
      )}
      {(profile.facebookUrl || profile.instagramUrl) && (
        <div className="mt-3 flex justify-center gap-4 text-sm">
          {profile.facebookUrl && (
            <a
              href={profile.facebookUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#693f31] underline-offset-4 hover:underline"
            >
              Facebook
            </a>
          )}
          {profile.instagramUrl && (
            <a
              href={profile.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#693f31] underline-offset-4 hover:underline"
            >
              Instagram
            </a>
          )}
        </div>
      )}

      <p className="mt-3 text-sm text-[#80685b]">
        © 2026 {profile.businessName}. All rights reserved.
      </p>
    </footer>
  );
}
