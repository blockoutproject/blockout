import { useQuery } from '@tanstack/react-query';
import { Division } from '@/src/types/Division';
import { useApis } from '@/src/context/ApiProvider';

export const useDivisions = () => {
    const { mobile } = useApis();
    
    return useQuery<Division[]>({
        queryKey: ['divisions'],
        queryFn: async () => {
            return await mobile.config.getDivisions();
        },
        staleTime: 1000 * 60,
    });
};