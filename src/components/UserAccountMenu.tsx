"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  EXPERIENCE_LABELS,
  STYLE_LABELS,
  type UserProfile,
} from "@/lib/auth/types";
import { EditProfileModal } from "@/components/EditProfileModal";
import { HowToGuideModal } from "@/components/HowToGuideModal";

interface UserAccountMenuProps {
  user: UserProfile;
  onLogout: () => void;
  onProfileUpdated: (user: UserProfile) => void;
}

function UserIcon() {
  return (
    <svg
      className="account-menu-icon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" fill="currentColor" />
      <path
        d="M5 19.5c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function UserAccountMenu({
  user,
  onLogout,
  onProfileUpdated,
}: UserAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className="account-menu" ref={rootRef}>
        <button
          type="button"
          className="account-menu-trigger"
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <UserIcon />
        </button>

        {open ? (
          <div
            id={menuId}
            className="account-menu-dropdown panel"
            role="menu"
            aria-label="Account"
          >
            <div className="account-menu-header">
              <p className="account-menu-name">{user.name}</p>
              <p className="muted account-menu-meta">@{user.username}</p>
              <p className="muted account-menu-meta">{user.email}</p>
              <p className="account-menu-style">
                {STYLE_LABELS[user.stylePreference]} ·{" "}
                {EXPERIENCE_LABELS[user.experienceLevel]}
              </p>
              {!user.emailVerified ? (
                <p className="account-menu-unverified">Email not verified</p>
              ) : null}
            </div>

            <button
              type="button"
              className="account-menu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setShowEdit(true);
              }}
            >
              Edit profile
            </button>
            <button
              type="button"
              className="account-menu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setShowHowTo(true);
              }}
            >
              How to
            </button>
            <button
              type="button"
              className="account-menu-item account-menu-item-danger"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>

      {showEdit ? (
        <EditProfileModal
          user={user}
          onClose={() => setShowEdit(false)}
          onSaved={onProfileUpdated}
        />
      ) : null}

      {showHowTo ? (
        <HowToGuideModal onClose={() => setShowHowTo(false)} />
      ) : null}
    </>
  );
}
