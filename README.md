# HUILERIE MASMOUDI - Système de Gestion d'Usine d'Huile d'Olive

## 📋 Vue d'ensemble

HUILERIE MASMOUDI est un système de gestion complet pour une usine d'extraction d'huile d'olive. Cette application Next.js permet de gérer efficacement les agriculteurs, leurs boîtes d'olives, les sessions de traitement et les paiements.

## 🏗️ Architecture de l'Application

### Structure des Pages

1. **Dashboard (/)** - Tableau de bord principal avec métriques et activités récentes
2. **Gestion des Olives (/olive-management)** - Gestion des agriculteurs et de leurs boîtes
3. **Gestion de l'Huile (/oil-management)** - Traitement des extractions et gestion des paiements

### Entités Principales

#### 1. Agriculteur (Farmer)
- **ID unique** : Identifiant système
- **Nom** : Nom complet (requis)
- **Téléphone** : Numéro de contact (optionnel)
- **Type** : Petit (0.15 DT/kg) ou Grand (0.20 DT/kg)
- **Date d'ajout** : Date de création
- **Boîtes** : Collection de boîtes associées

#### 2. Boîte (Box)
- **ID** : Identifiant unique (1-600 pour normales/nchira, auto pour chkara)
- **Type** : 
  - `nchira` : Boîtes rouges spéciales
  - `chkara` : Sacs avec ID automatique (Chkara1, Chkara2...)
  - `normal` : Boîtes standard
- **Poids** : Poids en kilogrammes
- **Statut de sélection** : Pour le traitement

#### 3. Session de Traitement (ProcessingSession)
- **ID de session** : Identifiant unique (format S + timestamp)
- **Date de traitement** : Date d'extraction
- **Poids d'huile** : Quantité d'huile extraite
- **Prix total** : Calculé automatiquement (poids total × prix/kg)
- **Nombre de boîtes** : Quantité de boîtes traitées
- **IDs des boîtes** : Liste des boîtes incluses
- **Statut de traitement** : pending/processed
- **Statut de paiement** : unpaid/paid

## 🔄 Flux de Travail Complet

### 1. Gestion des Agriculteurs

#### Création d'un Agriculteur
\`\`\`
1. Accéder à "Gestion des olives"
2. Cliquer "Ajouter agriculteur"
3. Saisir nom (requis) et téléphone (optionnel)
4. Sélectionner type (petit/grand)
5. Le prix par kg est assigné automatiquement
6. Enregistrer
\`\`\`

#### Modification d'un Agriculteur
\`\`\`
1. Sélectionner l'agriculteur dans la liste
2. Cliquer l'icône "Modifier"
3. Modifier les informations
4. Le changement de type met à jour le prix automatiquement
5. Enregistrer les modifications
\`\`\`

### 2. Gestion des Boîtes

#### Ajout de Boîte Individuelle
\`\`\`
1. Sélectionner un agriculteur
2. Cliquer "Ajouter boîte"
3. Choisir le type :
   - Normal/Nchira : Saisir ID (1-600)
   - Chkara : ID automatique généré
4. Saisir le poids
5. Validation automatique des IDs
6. Enregistrer
\`\`\`

#### Ajout en Lot (Bulk Add)
\`\`\`
1. Cliquer "Ajout en lot"
2. Spécifier le nombre de boîtes (max 50)
3. Saisir ID et poids pour chaque boîte
4. Validation en temps réel
5. Ajouter toutes les boîtes valides
\`\`\`

#### Sélection pour Traitement
\`\`\`
1. Cocher les boîtes individuellement
2. Ou utiliser "Sélectionner tout"
3. Visualisation du poids total et valeur estimée
4. Cliquer "Terminer le traitement"
\`\`\`

### 3. Traitement et Extraction

#### Initiation du Traitement
\`\`\`
1. Depuis la gestion des olives, sélectionner les boîtes
2. Cliquer "Terminer le traitement"
3. Session créée automatiquement avec statut "pending"
4. Redirection vers "Gestion de l'huile"
5. Auto-sélection de l'agriculteur
\`\`\`

#### Complétion du Traitement
\`\`\`
1. Dans "Gestion de l'huile", cliquer sur session pending
2. Saisir le poids d'huile extrait
3. Saisir la date de traitement
4. Enregistrer - statut passe à "processed"
5. Session prête pour paiement
\`\`\`

### 4. Gestion des Paiements

#### Marquage du Paiement
\`\`\`
1. Session avec statut "processed" et "unpaid"
2. Cliquer "Marquer comme payé"
3. Confirmer l'action
4. Mise à jour automatique des totaux
5. Génération possible de facture
\`\`\`

#### Impression de Facture
\`\`\`
1. Session payée ou non payée
2. Cliquer "Imprimer"
3. Aperçu de la facture complète
4. Impression avec CSS optimisé
5. Informations complètes : entreprise, client, détails
\`\`\`

## 🔧 Fonctionnalités Avancées

### Auto-création d'Agriculteurs
- Si un agriculteur n'existe pas lors du traitement, il est créé automatiquement
- Données récupérées depuis le localStorage
- Seamless workflow entre les pages

### Système de Notifications
- Notifications en temps réel pour toutes les actions
- Auto-disparition après 5 secondes
- Types : success, error, warning

### Validation Intelligente
- IDs de boîtes uniques (1-600)
- Chkara avec IDs séquentiels automatiques
- Validation en temps réel des formulaires
- Messages d'erreur contextuels

### Reconstruction (Rebuild)
- Fonctionnalité pour recréer un agriculteur supprimé
- Redirection automatique vers gestion des olives
- Pré-sélection de l'agriculteur

### Filtres et Recherche
- Recherche par nom d'agriculteur
- Filtres par type (petit/grand)
- Filtres par statut de paiement
- Recherche en temps réel

## 📊 Métriques et Statistiques

### Dashboard
- Total agriculteurs du jour
- Boîtes actives (420/600)
- Extractions en attente
- Revenus du jour
- Graphiques de production
- Activité récente

### Calculs Automatiques
- Prix total = Poids total × Prix par kg
- Totaux par agriculteur
- Montants dus vs payés
- Statistiques de sessions

## 🎨 Interface Utilisateur

### Thème et Couleurs
- **Primaire** : #6B8E4B (Vert olive)
- **Secondaire** : #F4D03F (Jaune doré)
- **Accent** : #8B4513 (Brun)
- **Fond** : #FDF5E6 (Beige clair)
- **Texte** : #2C3E50 (Bleu foncé)

### Composants Visuels
- Cards avec ombres et hover effects
- Badges colorés par statut
- Progress bars pour les métriques
- Icons Lucide React
- Animations fluides

### Responsive Design
- Optimisé pour desktop
- Sidebar fixe
- Grilles adaptatives
- Modals centrées

## 🔐 Gestion des États

### LocalStorage
- Sessions de traitement temporaires
- Données d'agriculteurs pour auto-création
- IDs sélectionnés pour navigation
- Préférences utilisateur

### État Global
- Gestion via React hooks
- Synchronisation temps réel
- Notifications centralisées
- Navigation fluide entre pages

## 📱 Fonctionnalités Spéciales

### Types de Boîtes
1. **Nchira** (Rouge) : Boîtes spéciales avec IDs 1-600
2. **Chkara** (Bleu) : Sacs avec IDs automatiques séquentiels
3. **Normal** (Vert) : Boîtes standard avec IDs 1-600

### Système de Facturation
- En-tête avec logo et informations entreprise
- Détails client complets
- Tableau des services détaillé
- Calculs automatiques
- Footer professionnel
- CSS print optimisé

### Confirmations de Suppression
- Dialogs de confirmation pour toutes les suppressions
- Agriculteurs et sessions
- Actions irréversibles protégées
- Messages d'avertissement clairs

## 🚀 Installation et Démarrage

\`\`\`bash
# Installation des dépendances
npm install

# Démarrage en développement
npm run dev

# Build de production
npm run build

# Démarrage en production
npm start
\`\`\`

## 📁 Structure des Fichiers

\`\`\`
/
├── app/
│   ├── layout.tsx              # Layout principal
│   ├── page.tsx                # Dashboard
│   ├── globals.css             # Styles globaux
│   ├── olive-management/
│   │   ├── page.tsx            # Gestion des olives
│   │   └── loading.tsx         # Loading state
│   └── oil-management/
│       ├── page.tsx            # Gestion de l'huile
│       └── loading.tsx         # Loading state
├── components/ui/              # Composants shadcn/ui
├── lib/
│   ├── types.ts                # Types TypeScript
│   ├── utils.ts                # Utilitaires
│   └── constants.ts            # Constantes
├── package.json                # Dépendances
├── tailwind.config.ts          # Configuration Tailwind
├── tsconfig.json               # Configuration TypeScript
└── next.config.mjs             # Configuration Next.js
\`\`\`

## 🔄 Intégration Backend

Cette application frontend est prête pour l'intégration avec une API backend. Voir `BACKEND_README.md` pour les spécifications détaillées des endpoints requis.

## 📋 Prochaines Étapes

1. **Développement Backend** : Création des APIs REST
2. **Base de Données** : Implémentation du schéma SQL
3. **Authentification** : Système de login/logout
4. **Rapports** : Génération de rapports PDF
5. **Export/Import** : Fonctionnalités CSV/Excel
6. **Notifications** : Système de notifications push
7. **Mobile** : Version responsive mobile

## 🤝 Contribution

Ce projet suit les standards Next.js 14 avec App Router, TypeScript, et Tailwind CSS. Toutes les contributions doivent respecter les conventions de code établies.

---

**HUILERIE MASMOUDI** - Votre partenaire pour une gestion d'usine d'huile d'olive moderne et efficace.
