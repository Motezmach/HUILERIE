# 🫒 Système de Gestion des Collecteurs d'Olives

## 📋 Vue d'Ensemble

Le système de gestion des collecteurs d'olives est un outil complet pour suivre les groupes de collecteurs, leurs collectes quotidiennes (chakra et galba), les lieux de collecte, et les clients. Le système est conçu pour être simple, efficace et facile à utiliser au quotidien.

---

## 🎯 Fonctionnalités Principales

### 1. **Gestion des Groupes de Collecteurs**
- Création illimitée de groupes (ex: "Groupe A", "Équipe 1", etc.)
- Chaque groupe a un nom unique
- Possibilité d'activer/désactiver des groupes
- Pas besoin de gérer le nombre de personnes dans chaque groupe

### 2. **Enregistrement des Collectes Quotidiennes**
- **Informations requises pour chaque collecte:**
  - Groupe de collecteurs
  - Date de collecte
  - Lieu de collecte (ex: "Ferme Ahmed", "Nord Village")
  - Client (pour qui la collecte est faite)
  - Nombre de **Chakra** (شكارة)
  - Nombre de **Galba** (ق) - affichée comme "ق"
  - Prix par chakra (optionnel)
  - Notes (optionnel)

### 3. **Calcul Automatique**
- **Formule:** 5 galba = 1 chakra
- Le système calcule automatiquement le total en chakra:
  ```
  Total = Chakra + (Galba ÷ 5)
  ```
- Calcul automatique du montant total si le prix est fourni

### 4. **Suivi Quotidien par Groupe**
- Vue par groupe montrant les collectes du jour sélectionné
- Total de chakra pour chaque groupe
- Total de galba pour chaque groupe
- Détails de chaque collecte (lieu, client, quantités)

### 5. **Système d'Impression Avancé**
- **Rapport personnalisable par période:**
  - Sélection de date début et date fin
  - Regroupement automatique par groupe de collecteurs
  - Totaux par groupe (chakra + galba)
  - Grand total pour toute la période
  
- **Mise en page professionnelle:**
  - Format paysage optimisé pour l'impression
  - Tableaux clairs et bien structurés
  - En-têtes et légende inclus
  - Date d'impression automatique

### 6. **Statistiques en Temps Réel**
- Nombre de groupes actifs
- Total collecté aujourd'hui (en chakra)
- Total général collecté (toutes périodes)
- Montant total du jour
- Nombre de collectes du jour

---

## 🎨 Interface Utilisateur

### Écran Principal
L'interface affiche des **cartes par groupe** avec:
- **En-tête coloré** avec le nom du groupe
- **Badge avec le total** du jour en chakra
- **Résumé du jour** avec:
  - Nombre de chakra
  - Nombre de galba (ق)
- **Liste des collectes du jour** montrant:
  - Lieu de collecte
  - Nom du client
  - Quantités détaillées (chakra, galba, total)
  - Bouton de suppression rapide

### Formulaire d'Ajout de Collecte
Un formulaire clair et rapide avec:
1. Sélection du groupe
2. Date de collecte
3. Lieu de collecte
4. Nom du client
5. Nombre de chakra
6. Nombre de galba (0-4, car 5 galba = 1 chakra)
7. Prix par chakra (optionnel)
8. Notes (optionnel)
9. **Aperçu du calcul en temps réel** montrant le total et le montant

### Vue Impression
- **Bouton "Rapport"** pour accéder à la vue d'impression
- Sélection de période (date début - date fin)
- **Bouton "Imprimer"** déclenchant l'impression
- Regroupement automatique par groupe avec:
  - Tableau détaillé de toutes les collectes
  - Totaux par groupe
  - Légende claire (P = Présent, A = Absent pour référence)

---

## 🗄️ Structure de la Base de Données

### Modèle: CollectorGroup (Groupes de Collecteurs)
```prisma
model CollectorGroup {
  id          String          // ID unique
  name        String @unique  // Nom du groupe (ex: "Groupe A")
  isActive    Boolean         // Actif/Inactif
  createdAt   DateTime        // Date de création
  updatedAt   DateTime        // Dernière modification
  collections DailyCollection[] // Collections liées
}
```

### Modèle: DailyCollection (Collectes Quotidiennes)
```prisma
model DailyCollection {
  id             String   // ID unique
  groupId        String   // ID du groupe
  collectionDate DateTime // Date de collecte
  location       String   // Lieu (ex: "Ferme Ahmed")
  clientName     String   // Client (pour qui)
  chakraCount    Int      // Nombre de chakra
  galbaCount     Int      // Nombre de galba (ق)
  totalChakra    Decimal  // Total calculé: chakra + (galba/5)
  pricePerChakra Decimal? // Prix par chakra (optionnel)
  totalAmount    Decimal? // Montant total (optionnel)
  notes          String?  // Notes (optionnel)
  createdAt      DateTime // Date de création
  updatedAt      DateTime // Dernière modification
  
  group          CollectorGroup // Relation au groupe
}
```

---

## 🔧 API Endpoints

### Groupes de Collecteurs

#### `GET /api/collector-groups`
Récupère tous les groupes de collecteurs avec leurs 10 dernières collectes.

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Groupe A",
      "isActive": true,
      "collections": [...]
    }
  ]
}
```

#### `POST /api/collector-groups`
Crée un nouveau groupe de collecteurs.

**Corps de la requête:**
```json
{
  "name": "Groupe A"
}
```

#### `PUT /api/collector-groups/[id]`
Met à jour un groupe existant.

#### `DELETE /api/collector-groups/[id]`
Supprime un groupe.

### Collections Quotidiennes

#### `GET /api/collections`
Récupère toutes les collections avec filtres optionnels.

**Paramètres de requête:**
- `groupId` - Filtrer par groupe
- `startDate` - Date de début
- `endDate` - Date de fin

#### `POST /api/collections`
Enregistre une nouvelle collecte.

**Corps de la requête:**
```json
{
  "groupId": "uuid",
  "collectionDate": "2025-01-15",
  "location": "Ferme Ahmed",
  "clientName": "Mohamed Ben Ali",
  "chakraCount": 10,
  "galbaCount": 3,
  "pricePerChakra": 50.00,
  "notes": "Bonne qualité"
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "groupId": "uuid",
    "collectionDate": "2025-01-15T00:00:00.000Z",
    "location": "Ferme Ahmed",
    "clientName": "Mohamed Ben Ali",
    "chakraCount": 10,
    "galbaCount": 3,
    "totalChakra": 10.6,
    "pricePerChakra": 50.00,
    "totalAmount": 530.00,
    "notes": "Bonne qualité",
    "group": {
      "id": "uuid",
      "name": "Groupe A"
    }
  }
}
```

#### `PUT /api/collections/[id]`
Met à jour une collecte existante.

#### `DELETE /api/collections/[id]`
Supprime une collecte.

---

## 💡 Utilisation Quotidienne

### Flux de Travail Typique

1. **Le matin:**
   - Ouvrir la page "Collecteurs" dans la section Premium
   - Vérifier les groupes actifs

2. **Pendant la journée:**
   - À chaque retour de groupe, cliquer sur "Nouvelle Collecte"
   - Remplir rapidement:
     - Sélectionner le groupe
     - Entrer le lieu
     - Entrer le client
     - Saisir chakra et galba
     - (Optionnel) Prix et notes
   - Valider - le système calcule automatiquement

3. **Le soir:**
   - Consulter les cartes pour voir le résumé de chaque groupe
   - Vérifier les totaux du jour

4. **Fin de semaine/mois:**
   - Cliquer sur "Rapport"
   - Sélectionner la période souhaitée
   - Imprimer le rapport complet

---

## 🎨 Design et Thème

### Couleurs Principales
- **Amber (Doré):** Thème principal pour les collecteurs (`from-amber-500 to-amber-600`)
- **Vert Olive:** Pour les boutons d'action (`from-[#6B8E4B] to-[#5A7A3F]`)
- **Blanc/Gris clair:** Fond et cartes
- **Dégradés:** Pour un aspect moderne et professionnel

### Icônes
- 👥 `Users` - Groupes de collecteurs
- 📦 `Package` - Collections et chakra
- 📍 `MapPin` - Lieux de collecte
- 🖨️ `Printer` - Impression
- 📈 `TrendingUp` - Statistiques

### Responsive
- **Mobile:** Vue en colonne unique
- **Tablet:** 2 colonnes
- **Desktop:** 3 colonnes

---

## 📊 Calculs Automatiques

### Conversion Galba → Chakra
```javascript
const totalChakra = chakraCount + (galbaCount / 5)

// Exemple:
// 10 chakra + 3 galba = 10 + (3/5) = 10.6 chakra
```

### Calcul du Montant
```javascript
const totalAmount = totalChakra * pricePerChakra

// Exemple:
// 10.6 chakra × 50 DT = 530 DT
```

---

## 🖨️ Système d'Impression

### Caractéristiques
- **Format:** Paysage (landscape)
- **Papier:** A4
- **Marges:** 0.5cm

### Contenu du Rapport
1. **En-tête:**
   - Titre "RAPPORT DE COLLECTE DES OLIVES"
   - Période (du ... au ...)
   - Date d'impression

2. **Par Groupe:**
   - Nom du groupe en gros
   - Tableau détaillé:
     - Date
     - Lieu
     - Client
     - Chakra (ش)
     - Galba (ق)
     - Total (ش)
     - Montant
   - Totaux du groupe (P et A)

3. **Pied de page:**
   - Total des groupes
   - Total des collectes
   - Date d'impression

### CSS d'Impression
```css
@media print {
  @page {
    size: landscape;
    margin: 0.5cm;
  }
  
  .print\\:hidden {
    display: none !important;
  }
  
  /* Préserve les couleurs */
  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
```

---

## 🔐 Accès et Sécurité

### Accès à la Page
1. Se connecter à l'application
2. Aller au Dashboard
3. Entrer le code premium (9999)
4. Accéder à "Collecteurs" dans la navigation

### Navigation
- **Section Premium** → Barre latérale gauche
- **Menu:**
  - Citerne (coffres d'huile)
  - Employés (présence)
  - **Collecteurs** ← Nouvelle page

---

## 🚀 Avantages du Système

### Pour l'Administrateur
✅ **Simplicité:** Interface intuitive, facile à utiliser  
✅ **Rapidité:** Enregistrement en quelques secondes  
✅ **Précision:** Calculs automatiques, pas d'erreurs  
✅ **Traçabilité:** Historique complet de toutes les collectes  
✅ **Rapports:** Impression professionnelle pour comptabilité  

### Pour la Gestion
✅ **Visibilité:** Vue claire des performances de chaque groupe  
✅ **Suivi:** Statistiques en temps réel  
✅ **Comparaison:** Facile de comparer les groupes  
✅ **Documentation:** Rapports imprimables pour archives  

---

## 🔧 Installation et Migration

### 1. Mise à Jour du Schéma Prisma
Le schéma a été ajouté à `prisma/schema.prisma` avec:
- Modèle `CollectorGroup`
- Modèle `DailyCollection`

### 2. Exécuter la Migration
```bash
npx prisma migrate dev --name add_collectors_system
```

### 3. Vérifier la Migration
```bash
npx prisma studio
```

### 4. Tester le Système
1. Démarrer le serveur: `npm run dev`
2. Aller à `/huilerie` et entrer le code 9999
3. Cliquer sur "Collecteurs" dans la barre latérale
4. Créer un groupe test
5. Ajouter une collecte test
6. Tester l'impression

---

## 📝 Notes Importantes

### Unités
- **Chakra (شكارة):** Unité principale de mesure
- **Galba (ق):** 5 galba = 1 chakra
- Le système ne gère PAS les kilogrammes - seulement chakra et galba

### Données Requises
- **Obligatoire:** Groupe, Date, Lieu, Client, Chakra, Galba
- **Optionnel:** Prix par chakra, Notes

### Limitations
- Un seul enregistrement par collecte
- Pas de modification en masse (une par une)
- Suppression sans confirmation (bouton direct)

---

## 🎯 Cas d'Usage Typiques

### Cas 1: Collecte Simple
```
Groupe: Groupe A
Date: 15/01/2025
Lieu: Ferme Nord
Client: Ahmed
Chakra: 8
Galba: 2
→ Total: 8.4 chakra
```

### Cas 2: Collecte Avec Prix
```
Groupe: Équipe 1
Date: 15/01/2025
Lieu: Sud Village
Client: Mohamed
Chakra: 12
Galba: 4
Prix/chakra: 50 DT
→ Total: 12.8 chakra
→ Montant: 640 DT
```

### Cas 3: Multiple Collectes/Jour
Un même groupe peut avoir plusieurs collectes le même jour s'ils vont à différents endroits ou pour différents clients.

---

## 🎨 Personnalisation Future

### Améliorations Possibles
- 📊 Graphiques de performance par groupe
- 📱 Version mobile dédiée
- 🔔 Notifications de collecte
- 💰 Gestion des paiements aux collecteurs
- 📍 Carte des lieux de collecte
- 🏆 Classement des groupes
- 📧 Export PDF des rapports
- 📆 Planning de collecte

---

## ✅ Checklist de Déploiement

- [x] Schéma Prisma mis à jour
- [x] Migration créée et testée
- [x] API routes créées et testées
- [x] Page frontend créée
- [x] Navigation ajoutée au layout
- [x] Système d'impression fonctionnel
- [x] Calculs automatiques vérifiés
- [x] Design responsive
- [x] Documentation complète
- [ ] Migration base de données production
- [ ] Test utilisateur final
- [ ] Formation équipe

---

## 🆘 Support et Maintenance

### En cas de problème:
1. Vérifier que la migration a bien été exécutée
2. Vérifier les logs du serveur
3. Tester les API endpoints individuellement
4. Vérifier les permissions de la base de données

### Logs à surveiller:
- Erreurs de création de collecte
- Erreurs de calcul (totalChakra)
- Erreurs d'impression

---

**Système créé avec ❤️ pour une gestion efficace des collecteurs d'olives**

*Dernière mise à jour: Octobre 2025*

