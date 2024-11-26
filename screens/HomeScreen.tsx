import React from 'react';
import { View, Text, Button } from 'react-native';

const HomeScreen = ({ navigation }: any) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Bienvenue sur l'écran d'accueil !</Text>
      <Button
        title="Aller aux détails"
        onPress={() => navigation.navigate('Details')}
      />
    </View>
  );
};

export default HomeScreen;