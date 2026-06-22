"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

const ADMIN_ROLES = new Set(["owner", "manager", "cashier"]);

export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !user) return;
    if (ADMIN_ROLES.has(user.role)) {
      router.replace("/dashboard");
    } else {
      router.replace("/kiosk");
    }
  }, [ready, user, router]);

  return null;
}
