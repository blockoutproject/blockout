import type { PropsWithChildren } from "react";
import { AccessAdmissionProvider } from "../../access/queries/use-access-admission";
import { ProProvider } from "../../pro";
import { AgeDeclarationProvider } from "../age-declaration-provider";

/**
 * Real root admission, entitlement and advertising contexts below existing F05/Query owners.
 * Independent consumer suites leave installation reads disabled and supply their native I/O mocks;
 * counter/consent integration suites instead mount an enabled owner with explicit unit configuration.
 */
export function AdvertisingProviders({ children }: PropsWithChildren) {
  return (
    <AccessAdmissionProvider>
      <ProProvider>
        <AgeDeclarationProvider enabled={false}>
          {children}
        </AgeDeclarationProvider>
      </ProProvider>
    </AccessAdmissionProvider>
  );
}
