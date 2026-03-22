## Sonar cube badges
[![Quality gate](https://sonarqube.ensimag.fr/api/project_badges/quality_gate?project=TPFullstack_nolan_blanc&token=sqb_75d1412bd6b7a8827ee2cacbab7b58ac1eb02ee3)](https://sonarqube.ensimag.fr/dashboard?id=TPFullstack_nolan_blanc)
[![Bugs](https://sonarqube.ensimag.fr/api/project_badges/measure?project=TPFullstack_nolan_blanc&metric=bugs&token=sqb_75d1412bd6b7a8827ee2cacbab7b58ac1eb02ee3)](https://sonarqube.ensimag.fr/dashboard?id=TPFullstack_nolan_blanc)
[![Coverage](https://sonarqube.ensimag.fr/api/project_badges/measure?project=TPFullstack_nolan_blanc&metric=coverage&token=sqb_75d1412bd6b7a8827ee2cacbab7b58ac1eb02ee3)](https://sonarqube.ensimag.fr/dashboard?id=TPFullstack_nolan_blanc)


---
title: Projet React 
author:  
- Blanc Nolan
--- 

## Installation

Donner les éléments pour installer l'application sur une machine nue à partir de votre dépôt

En mode développement : 

~~~bash
cd frontend;npm install;npm run dev #frontend en mode développement (accessible à http://localhost:5173)
commande # pour lancer les tests frontend
cd backend;npm install;npm run stardev # backend en mode développement avec accès à l'api via http://localhost:3000/api
#cd backend;npm install;npm run startdev:proxyreact #backend en mode développement avec un accès à l'application react via un proxy à http://localhost:3000/ et l'api à http://localhost:3000/api
commande # pour lancer les tests backend ?
~~~

En mode production :

~~~bash
cd frontend;npm install;npm run build # génération du frontend dans frontend/dist
cd backend;npm install;npm run start # backend
firefox https://xxx.scalingo.ioscalingo/ # pour accéder à l'application si déployé en ligne
firefox https://xxx.scalingo.ioscalingo/docs # pour accéder à la doc scalingo si déployé en ligne
~~~

## Cahier des charges

Ici vous décrivez les fonctionnalités souhaitées et celles effectivement mises en oeuvre. Avec un diagramme UML des cas d'usage et des maquettes des vues souhaitées et des captures d'écran de ce qui a été réalisé.

### Cas d'usage

A modifier/compléter 

```plantuml
@startuml
left to right direction
actor "Visitor" as v
actor "Registered User" as u
actor "Admin" as a
u <-- a
rectangle Application {
  usecase "Register" as R
  usecase "Connect" as C
  usecase "Create a Group" as CG
  usecase "Add user in one of my groups" as AU
  usecase "Delete user in one of my groups" as AU
  usecase "Delete a Group" as DG
  usecase "Change role" as CR
}
a --> DG
a --> CR
v --> R
u --> C
u --> AU
u --> CG
@enduml
```

### Maquettes

A modifier/compléter...

```plantuml
@startsalt
<style>
header {
  TextAlignement right
  BackGroundColor gray
  FontColor white
}
</style>
header {- Alice@aol.fr | [Se déconnecter] }
{
{^Mes groupes
**Ceux dont je suis membre**
* Ensimag
* Grenoble INP
* <b>Club gaming
----
**Ceux que j'administre**
* Club Gaming
* Running
"<i>nom du nouveau groupe" 
 [Créer]
}|
{^"Discussion sur le groupe <b>Club Gaming"
{SI
  [Salut , ca va? ] | Charlie
  [Super, et toi?] | Asimov
  [On se fait un truc] | Asimov
  [Une idée? ] | Charlie
  . | [Hello, oui]
  ----|----
}
{+ "Une partie de LOL après?" | [Envoyer ] }
}
}
@endsalt
```

### Captures d'écran

A compléter

### API mise en place

Donner le lien vers la documentation swagger et/ou faire un tableau récapitulant l'API

A compléter

## Architecture du code

### FrontEnd

Indiquer ici l'organisation de votre code. Et les choix faits pour le frontend.

~~~bash
# exemple d'arborescence commentée avec la commande 'tree'
login@pc nomProjet % tree --charset=ascii frontend
.
|-- README.md
|-- index.html
|-- package.json
|-- src
|   |-- App.css
|   |-- App.jsx
|   |-- components
|   |   `-- ComposantX.jsx # Formulaire de login
|   |-- index.css # feuille de style
|   |-- main.jsx
|   |-- utils
|   `-- views
|       `-- ViewX.jsx
~~~

### Backend

#### Schéma de votre base de donnée

A modifier/compléter...

```plantuml
class User{
  name
  email
  passhash
  isAdmin : boolean
}

class Message{
  content
}

class Group{
  name
}

User "1" -- "n" Message : posts
Group "1" -- "n" Message : contains

User "n" -- "n"  Group : is member 
User "1" -- "n"  Group : create and own
```

#### Architecture de votre code

Indiquer ici l'organisation de votre code. Et les choix faits pour le backend.

~~~bash
# exemple d'arborescence commentée
tree --charset=ascii backend                                                                                                          
.
|-- src
|   |-- __tests__
|   |   `-- testX.js
|   |-- app.js
|   |-- controllers
|   |   `-- controllerX.js #controlleur de api/group:id
|   |-- models
|   |   `-- modelX.js #modèle de user
|   |-- routes
|   |   `-- routeX.js #route gérant api/group{/:id}
|   |-- server.js
|   `-- util
|       |-- utilX.js #initialisation de la BD
|-- swagger_output.json
`-- bd.sqlite
~~~

### Gestion des rôles et droits

Expliquer ici les différents rôles mis en place, et comment ils sont gérés dans votre code.

- Coté backend

- Coté frontend


## Test

### Backend

Décrivez les tests faits au niveau du backend, leur couverture.

### Frontend

Décrivez les tests faits au niveau du backend, leur couverture.

## Intégration + déploiement (/3)

Décrivez ici les éléments mis en place au niveau de l'intégration continue