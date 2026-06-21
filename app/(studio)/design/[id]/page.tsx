import DesignWorkspace from "@/components/DesignWorkspace";

export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DesignWorkspace id={id} />;
}
