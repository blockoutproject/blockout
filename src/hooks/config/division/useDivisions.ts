import { useQuery } from '@tanstack/react-query';
import { Division } from '@/src/types/Division';
import ConfigApi from '@/src/api/ConfigApi';

export const useDivisions = () => {
    return useQuery<Division[]>({
        queryKey: ['divisions'],
        queryFn: async () => {
            return await ConfigApi.getInstance().listDivisions();
        },
        staleTime: 1000 * 60,
    });
};