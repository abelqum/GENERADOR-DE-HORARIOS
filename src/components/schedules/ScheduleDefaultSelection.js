"use client";

import { useEffect } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

export default function ScheduleDefaultSelection({
  view,
  selectedEntityId,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!selectedEntityId) {
      return;
    }

    const parameterName =
      view === "group"
        ? "grupo"
        : "profesor";

    if (searchParams.get(parameterName)) {
      return;
    }

    const params = new URLSearchParams(
      searchParams.toString(),
    );

    params.set("vista", view);
    params.set(
      parameterName,
      selectedEntityId,
    );

    router.replace(`?${params.toString()}`);
  }, [
    view,
    selectedEntityId,
    router,
    searchParams,
  ]);

  return null;
}