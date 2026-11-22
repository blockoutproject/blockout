import type { ReactNode } from "react";
import { PageContent, PageScrollView } from "@/shared/components/page";
import { ScreenState } from "@/shared/components/screen-state";

/** Keeps collection skeletons in the content flow and confirmed feedback in the shared card layout. */
export function CollectionReadState({
  pending = false,
  children,
}: Readonly<{ pending?: boolean; children: ReactNode }>) {
  const Layout = pending ? PageContent : ScreenState;
  return (
    <PageScrollView>
      <Layout>{children}</Layout>
    </PageScrollView>
  );
}
