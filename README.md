### Prérequis

- **Node.js** (version recommandée : 16.x ou 18.x)
- **npm** (ou **yarn**)
- **Expo CLI** : Installez-le globalement si nécessaire :

  ```bash
  npm install -g expo-cli
  ```

- **Xcode** (pour macOS, si vous développez pour iOS)
- **Android Studio** (pour le développement Android)

### Étapes pour démarrer le projet

1. **Installation des dépendances** :

   ```bash
   npm install
   ```

2. **Génération des dossiers natifs** :

   Utilisez la commande suivante pour créer les répertoires `ios/` et `android/` nécessaires :

   ```bash
   npx expo prebuild
   ```

   *Remarque* : Cette commande génère les projets natifs en fonction de votre configuration actuelle. 

3. **Démarrage de l'application en mode développement** :

   Après la pré-construction, lancez le serveur de développement avec :

   ```bash
   npx expo start --dev-client
   ```

   *Remarque* : L'option `--dev-client` permet d'utiliser un client de développement personnalisé au lieu d'Expo Go. 


### Build pour mobile

    eas build --platform ios --profile development

### Résumé des commandes

```bash
npm install
npx expo prebuild
npx expo start --dev-client
eas build --platform ios --profile development
```