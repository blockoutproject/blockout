import {useQuery} from "@tanstack/react-query";
import {ScraperStatusResponse} from "@/src/modules/administration/model/ScraperStatus";
import {useApis} from "@/src/shared/providers/ApiProvider";

export const useScraperStatuses = () => {
  const {mobile} = useApis();

  return useQuery<ScraperStatusResponse[]>({
    queryKey: ["scraper-statuses"],
    queryFn: () => mobile.config.getScraperStatuses(),
    staleTime: 1000 * 60,
  });
};
