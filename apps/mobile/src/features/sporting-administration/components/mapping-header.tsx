import { useAccessAdmission } from "@/features/access/queries/use-access-admission";
import { SupportFlagAction } from "@/features/support";
import { PageHeader } from "@/shared/components/page-header";

export function MappingHeader({
  title = "Mapping des poules",
  subtitle,
}: Readonly<{ title?: string; subtitle?: string }>) {
  const { ordinary } = useAccessAdmission();
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      action={
        ordinary && <SupportFlagAction origin={{ screen: "pool-mapping" }} />
      }
    />
  );
}
