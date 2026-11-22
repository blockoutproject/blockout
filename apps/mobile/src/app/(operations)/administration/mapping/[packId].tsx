import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { MappingPackScreen } from "@/features/sporting-administration/screens/mapping-pack-screen";
import { MappingHeader } from "@/features/sporting-administration/components/mapping-header";
import { Page, PageScrollView } from "@/shared/components/page";
import { ScreenState } from "@/shared/components/screen-state";
import { ErrorState } from "@/shared/components/state-card";

export default function MappingPackRoute() {
  const { packId } = useLocalSearchParams();
  const id = z.string().uuid().safeParse(packId);
  return id.success ? (
    <MappingPackScreen packId={id.data} />
  ) : (
    <Page header={<MappingHeader />}>
      <PageScrollView>
        <ScreenState>
          <ErrorState />
        </ScreenState>
      </PageScrollView>
    </Page>
  );
}
