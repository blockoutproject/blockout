import React from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import BottomSheetCustomPage from "@/src/shared/ui/bottom-sheet/bottom-sheet-custom-page";
import LegalDocumentScreen from "@/src/modules/legal/ui/legal-document-screen";

type ProfileLegalSheetsProps = {
  imprintRef: React.RefObject<BottomSheetModal | null>;
  termsRef: React.RefObject<BottomSheetModal | null>;
  privacyRef: React.RefObject<BottomSheetModal | null>;
  onCloseImprint: () => void;
  onCloseTerms: () => void;
  onClosePrivacy: () => void;
};

const ProfileLegalSheets = ({
  imprintRef,
  termsRef,
  privacyRef,
  onCloseImprint,
  onCloseTerms,
  onClosePrivacy,
}: ProfileLegalSheetsProps) => (
  <>
    <BottomSheetCustomPage ref={imprintRef}>
      <LegalDocumentScreen
        type="imprint"
        title="Mentions Légales"
        onCloseSheet={onCloseImprint}
      />
    </BottomSheetCustomPage>
    <BottomSheetCustomPage ref={termsRef}>
      <LegalDocumentScreen
        type="terms"
        title="Conditions Générales d'Utilisation"
        onCloseSheet={onCloseTerms}
      />
    </BottomSheetCustomPage>
    <BottomSheetCustomPage ref={privacyRef}>
      <LegalDocumentScreen
        type="privacy"
        title="Politique de Confidentialité"
        onCloseSheet={onClosePrivacy}
      />
    </BottomSheetCustomPage>
  </>
);

export default ProfileLegalSheets;
