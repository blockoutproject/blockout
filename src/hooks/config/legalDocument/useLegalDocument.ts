import { useQuery } from "@tanstack/react-query";
import { LegalDocument, LegalDocumentType } from "@/src/types/LegalDocument";
import { useApis } from "@/src/context/ApiProvider";

export const useLegalDocument = (type: LegalDocumentType) => {
    const { config } = useApis();

    return useQuery<LegalDocument, Error>({
        queryKey: ["legal-doc", type],
        queryFn: () => config.getLegalDocument(type),
        enabled: !!type,
        staleTime: 60 * 60 * 1000,
    });
};