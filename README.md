### Docker

Pour lancer les BDD et leurs UIs : docker-compose up

### Lancer l'application

Pour lancer l'application en local, il faut d'abord générer les fichiers source :
`mvn clean install`

Puis lancer le [main](src/main/java/myvolley/MyVolleyApplication.java) de l'application.

Une fois l'application en cours d'exécution, le swagger est disponible [ici](http://localhost:8082/swagger-ui/index.html).
