import {useQuery} from "@tanstack/react-query";
import {LegalDocumentResponse, LegalDocumentType} from "@/src/modules/legal/model/LegalDocument";
import {useApis} from "@/src/shared/providers/ApiProvider";

export const useLegalDocument = (type: LegalDocumentType) => {
  const {mobile} = useApis();

  return useQuery<LegalDocumentResponse, Error>({
    queryKey: ["legal-doc", type],
    queryFn: () => mobile.config.getLegalDocument(type),
    enabled: !!type,
    staleTime: 60 * 60 * 1000,
  });
};
