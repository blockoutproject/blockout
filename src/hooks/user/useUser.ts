import { useAuth0 } from 'react-native-auth0';
import UsersApi from '@/src/api/UsersApi';
import { CustomUser, UserRegistrationRequest } from '@/src/types/User';
import { useQuery } from '@tanstack/react-query';

export function useUser() {
  const { user: auth0User, isLoading: isAuth0Loading } = useAuth0();

  // Récupérer/créer l'utilisateur dans notre BDD
  const { data, isLoading, error, refetch } = useQuery<CustomUser, unknown>({
    queryKey: ['user', auth0User?.sub],
    queryFn: async () => {
      if (!auth0User?.sub) {
        throw new Error('Utilisateur Auth0 non disponible');
      }

      const usersApi = UsersApi.getInstance();
      const existingUser = await usersApi.getUserByAuth0Id(auth0User.sub);

      if (existingUser) {
        return existingUser;
      }

      // Si l'utilisateur n'existe pas, on le crée
      const userRegistrationRequest: UserRegistrationRequest = {
        pseudo: 'test1'
      };
      const registeredUser = await usersApi.registerUser(userRegistrationRequest);
      return registeredUser;
    },
    enabled: !!auth0User?.sub,
    staleTime: 1000 * 60 * 5,
  });

  return {
    data,
    isLoading: isAuth0Loading || isLoading,
    error,
    refetch
  };
}
