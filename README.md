# Hollow Depths — Les Cryptes de Verre

Un nouveau jeu de rôle autonome pour navigateur et mobile. L’exploration utilise une véritable scène WebGL à la première personne : murs, sols, plafonds, profondeur, éclairage et brouillard. Les créatures sont des illustrations 2D animées intégrées à la scène, visibles à distance et masquées par les murs.

## Prototype 0.1

- Un labyrinthe conçu à la main : chemins alternatifs, coffre, clé, grille, source et sortie.
- Deux aventuriers, Kaël et Lys, et trois créatures originales avec cinq poses chacune.
- Six rencontres, dont un gardien final et des groupes de deux ennemis.
- Attaques normales automatiques ; Fracture, Éclat de givre et Sceau de soin manuels.
- Pause tactique, préparation d’un ordre par aventurier, ciblage et vitesse ×1 / ×2.
- Intentions ennemies visibles, interruptions, immobilisation, impacts et récupération après victoire.
- Carte découverte progressivement, commandes clavier et tactiles, sauvegarde locale avec export/import.
- PWA hors ligne après une première visite connectée complète, avec mises à jour explicites.
- Aucun bruitage ni musique pour cette première étape.

L’univers et le bestiaire sont originaux. Hollow Oath constitue une référence pour le style illustré et le rythme des combats ; Dinosaur Resurrection constitue une référence uniquement pour la vue 3D pendant l’exploration. Aucun de leurs fichiers graphiques n’est utilisé dans cette version.

## Jouer immédiatement

Ouvrir `release/Hollow-Depths.html` dans un navigateur récent : cette copie autonome intègre tous les graphismes et fonctionne sans installation ni serveur. WebGL doit être disponible. La PWA et son installation nécessitent la version servie en HTTP(S).

## Développement

Node.js 24 recommandé, pnpm 10.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
node scripts/build-standalone.mjs
```

Le rendu 3D est un petit moteur WebGL sans bibliothèque externe. Le moteur de combat, le monde, le rendu, l’interface et la persistance sont séparés. TypeScript strict et Vite sont employés pour la compilation et le développement. Tous les éléments du jeu sont locaux, sans compte, serveur de jeu ni télémétrie.

## Commandes

| Action | Clavier |
| --- | --- |
| Avancer / reculer | Z ou W / S, ou flèches haut / bas |
| Pivoter à gauche / droite | Flèches gauche / droite |
| Pas à gauche / droite | Q ou A / D |
| Interagir | E |
| Carte | M |
| Pause tactique / reprise | Espace |
| Fracture / givre / soin | 1 / 2 / 3 |
| Cible suivante | Tab |

En pause, tous les délais du combat sont figés. Un clic prépare une compétence ; un second clic sur la même compétence annule cet ordre. Un nouvel ordre pour le même aventurier remplace le précédent. Les PM sont consommés à l’exécution après la reprise. Un délai de 0,65 seconde sépare les compétences. Fermer le guide ou la carte ne reprend pas automatiquement un combat mis en pause.

La sauvegarde automatique conserve l’état au début d’un combat, puis la victoire. Elle ne permet pas d’exploiter un rechargement pour conserver les dégâts infligés à un ennemi. Les sauvegardes sont versionnées ; les fichiers importés sont validés avant remplacement. Le menu d’import et de nouvelle partie demande une confirmation avant d’écraser la progression.

## GitHub Pages

Le workflow `.github/workflows/deploy.yml` teste et compile le projet, puis déploie `dist/` à chaque push sur `main`. Dans les paramètres du dépôt, choisir **Pages → Source → GitHub Actions**. Les chemins sont relatifs et fonctionnent sous un sous-répertoire. Pour créer le dépôt depuis ce dossier avec GitHub CLI authentifié :

```sh
gh repo create hollow-depths --public --source=. --remote=origin --push
gh api repos/{owner}/hollow-depths/pages --method POST --field build_type=workflow
```

## Vérification

`pnpm test` vérifie la topologie du labyrinthe et de la grille, les collisions, les rencontres, la pause complète, les ordres préparés, les coûts et délais, les interruptions, les cibles, les récompenses, la source, les sauvegardes et la possibilité de vaincre chaque type d’adversaire.

Les essais sur iPhone SE et tablette Android restent nécessaires pour évaluer les performances réelles et l’installation PWA. Cette version est un premier niveau jouable, pas un RPG complet.

## Graphismes

`public/art/bestiary.png` est une planche originale générée pour ce projet : cinq poses, trois créatures. Les coordonnées de la planche sont définies par le rendu. Les textures architecturales et les effets sont créés par le code. Aucun son n’est chargé.
