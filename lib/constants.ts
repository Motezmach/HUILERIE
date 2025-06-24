// Application constants
export const APP_CONFIG = {
  name: "HUILERIE MASMOUDI",
  description: "Système de gestion d'usine d'huile d'olive professionnel",
  version: "1.0.0",
  company: {
    name: "HUILERIE MASMOUDI",
    address: "Tunis, Mahdia",
    phone: "27408877",
    email: "contact@huilerie-masmoudi.tn",
  },
}

// Box configuration
export const BOX_CONFIG = {
  maxBoxId: 600,
  minBoxId: 1,
  types: {
    nchira: {
      label: "Nchira (Rouge)",
      color: "red",
      icon: "package",
    },
    chkara: {
      label: "Chkara (Sac)",
      color: "blue",
      icon: "shopping-bag",
      autoId: true,
    },
    normal: {
      label: "Boîte normale",
      color: "green",
      icon: "package",
    },
  },
}

// Farmer configuration
export const FARMER_CONFIG = {
  types: {
    small: {
      label: "Petit agriculteur",
      pricePerKg: 0.15,
    },
    large: {
      label: "Grand agriculteur",
      pricePerKg: 0.2,
    },
  },
}

// Processing configuration
export const PROCESSING_CONFIG = {
  statuses: {
    pending: {
      label: "En attente",
      color: "red",
      priority: 1,
    },
    processed: {
      label: "Traité",
      color: "green",
      priority: 2,
    },
  },
  paymentStatuses: {
    unpaid: {
      label: "Non payé",
      color: "yellow",
      priority: 1,
    },
    paid: {
      label: "Payé",
      color: "green",
      priority: 2,
    },
  },
}

// API endpoints
export const API_ENDPOINTS = {
  farmers: "/api/farmers",
  boxes: "/api/boxes",
  sessions: "/api/sessions",
  dashboard: "/api/dashboard",
  reports: "/api/reports",
}

// Local storage keys
export const STORAGE_KEYS = {
  processingSessions: "processingSessions",
  processingFarmerData: "processingFarmerData",
  selectedFarmerId: "selectedFarmerId",
  rebuildFarmerId: "rebuildFarmerId",
  userPreferences: "userPreferences",
}

// Pagination defaults
export const PAGINATION = {
  defaultLimit: 10,
  maxLimit: 100,
  defaultPage: 1,
}

// Validation rules
export const VALIDATION = {
  farmer: {
    name: {
      minLength: 2,
      maxLength: 100,
      required: true,
    },
    phone: {
      minLength: 8,
      maxLength: 20,
      required: false,
      pattern: /^[+]?[0-9\s\-$$$$]+$/,
    },
  },
  box: {
    weight: {
      min: 0.1,
      required: true,
    },
    id: {
      min: 1,
      max: 600,
      required: true,
    },
  },
  session: {
    oilWeight: {
      min: 0,
      required: true,
    },
  },
}

// UI constants
export const UI_CONFIG = {
  colors: {
    primary: "#6B8E4B",
    secondary: "#F4D03F",
    accent: "#8B4513",
    background: "#FDF5E6",
    text: "#2C3E50",
  },
  animations: {
    duration: 300,
    easing: "ease-in-out",
  },
  notifications: {
    duration: 5000,
    position: "top-right",
  },
}

// Date formats
export const DATE_FORMATS = {
  display: "DD/MM/YYYY",
  input: "YYYY-MM-DD",
  datetime: "DD/MM/YYYY HH:mm",
  api: "YYYY-MM-DD HH:mm:ss",
}

// Error messages
export const ERROR_MESSAGES = {
  required: "Ce champ est requis",
  invalidEmail: "Adresse email invalide",
  invalidPhone: "Numéro de téléphone invalide",
  boxIdExists: "Cet ID de boîte est déjà utilisé",
  boxIdRange: "L'ID de la boîte doit être entre 1 et 600",
  networkError: "Erreur de connexion réseau",
  serverError: "Erreur serveur interne",
  unauthorized: "Accès non autorisé",
  notFound: "Ressource non trouvée",
}

// Success messages
export const SUCCESS_MESSAGES = {
  farmerCreated: "Agriculteur créé avec succès",
  farmerUpdated: "Agriculteur mis à jour avec succès",
  farmerDeleted: "Agriculteur supprimé avec succès",
  boxCreated: "Boîte créée avec succès",
  boxUpdated: "Boîte mise à jour avec succès",
  boxDeleted: "Boîte supprimée avec succès",
  sessionCreated: "Session créée avec succès",
  sessionUpdated: "Session mise à jour avec succès",
  sessionDeleted: "Session supprimée avec succès",
  paymentMarked: "Paiement marqué comme reçu",
}

// Feature flags
export const FEATURES = {
  bulkBoxAdd: true,
  autoFarmerCreation: true,
  printInvoices: true,
  exportData: true,
  notifications: true,
  realTimeUpdates: true,
}
