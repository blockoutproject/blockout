import { useAuth0 } from 'react-native-auth0';
import UsersApi from '@/src/api/UsersApi';
import { CustomUser } from '@/src/types/User';
import { useQuery } from '@tanstack/react-query';

export function useUser() {
  const { user: auth0User, isLoading: isAuth0Loading } = useAuth0();

  const { data, isLoading, error, refetch } = useQuery<CustomUser | null, unknown>({
    queryKey: ['user', auth0User?.sub],
    queryFn: async () => {
      if (!auth0User?.sub) {
        // On ne jette plus d’erreur si pas de sub, on renvoie undefined
        return null;
      }

      const usersApi = UsersApi.getInstance();
      // On vérifie simplement si l’utilisateur existe
      const existingUser = await usersApi.getUserByAuth0Id(auth0User.sub);
      return existingUser;
    },
    enabled: !!auth0User?.sub,
    staleTime: 1000 * 60 * 5,
  });

  return {
    data,
    isLoading: isAuth0Loading || isLoading,
    error,
    refetch,
  };
}