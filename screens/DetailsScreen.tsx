import React from 'react';
import { View, Text, Button } from 'react-native';

const DetailsScreen = ({ navigation }: any) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Voici les détails !</Text>
      <Button
        title="Retour à l'accueil"
        onPress={() => navigation.goBack()}
      />
    </View>
  );
};

export default DetailsScreen;