import React, { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { useAuth0 } from 'react-native-auth0';
import { View, ActivityIndicator } from 'react-native';

const AuthLayout: React.FC = () => {
  const { user, isLoading } = useAuth0();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/home');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default AuthLayout;