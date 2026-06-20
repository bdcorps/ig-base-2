"use client";

import DesignWorkspace from "@/components/DesignWorkspace";
import { use } from "react";

export default function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DesignWorkspace id={id} />;
}
