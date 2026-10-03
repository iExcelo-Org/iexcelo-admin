"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditPassageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/exam-revision/passages");
  }, [router]);
  return null;
}
