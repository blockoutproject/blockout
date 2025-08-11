import { useQuery } from "@tanstack/react-query";
import ConfigApi from "@/src/api/ConfigApi";
import { LegalDocument, LegalDocumentType } from "@/src/types/LegalDocument";

export const useLegalDocument = (type: LegalDocumentType) => {
    return useQuery<LegalDocument, Error>({
        queryKey: ["legal-doc", type],
        queryFn: () => ConfigApi.getInstance().getLegalDocument(type),
        enabled: !!type,
        staleTime: 60 * 60 * 1000,
    });
};