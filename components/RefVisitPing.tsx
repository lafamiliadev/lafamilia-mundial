"use client";

import { useEffect } from "react";
import { recordReferralVisit } from "@/app/actions/referrals";

// Records a single human visit per browser session to a share page.
export function RefVisitPing({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `copa-visit-${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable — still ping once
    }
    recordReferralVisit(slug).catch(() => {});
  }, [slug]);
  return null;
}
