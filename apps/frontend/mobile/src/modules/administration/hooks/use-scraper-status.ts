import { useQuery } from "@tanstack/react-query";
import { ScraperStatusResponse } from "@/src/shared/generated/models";
import { useApis } from "@/src/shared/providers/api-provider";

export const useScraperStatuses = () => {
  const { mobile } = useApis();

  return useQuery<ScraperStatusResponse[]>({
    queryKey: ["scraper-statuses"],
    queryFn: () => mobile.administration.getScraperStatuses(),
    staleTime: 1000 * 60,
  });
};
