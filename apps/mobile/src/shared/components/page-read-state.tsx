import type { ReactNode } from "react";
import { PageContent, PageScrollView } from "./page";
import { ScreenState } from "./screen-state";

/** Keeps page skeletons in the content flow and confirmed feedback in the shared card layout. */
export function PageReadState({
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
