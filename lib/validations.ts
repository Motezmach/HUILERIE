import { z } from 'zod'

// Farmer validation schemas
export const createFarmerSchema = z.object({
  name: z.string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .refine((val) => val.trim().split(/\s+/).length >= 2, {
      message: "Le nom doit contenir au moins deux mots (Prénom Nom)",
    }),
  phone: z.string().regex(/^[\+]? [0-9\s\-()]+$/, "Format de téléphone invalide").optional().or(z.literal("")),
  type: z.enum(['small', 'large'], {
    required_error: "Le type d'agriculteur est requis",
  }),
  pricePerKg: z.number().min(0.01, "Le prix par kg doit être supérieur à 0").max(10, "Le prix par kg semble trop élevé").optional()
})

export const updateFarmerSchema = z.object({
  name: z.string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .refine((val) => val.trim().split(/\s+/).length >= 2, {
      message: "Le nom doit contenir au moins deux mots (Prénom Nom)",
    })
    .optional(),
  phone: z.string().regex(/^[\+]? [0-9\s\-()]+$/, "Format de téléphone invalide").optional().or(z.literal("")),
  type: z.enum(['small', 'large']).optional(),
  pricePerKg: z.number().min(0.01, "Le prix par kg doit être supérieur à 0").max(10, "Le prix par kg semble trop élevé").optional()
})

// Box validation schemas
export const createBoxSchema = z.object({
  id: z.string().min(1, "L'ID de la boîte est requis"),
  type: z.enum(['nchira', 'chkara', 'normal'], {
    required_error: "Le type de boîte est requis",
  }),
  weight: z.number().min(0.1, "Le poids doit être supérieur à 0").optional(),
  farmerId: z.string().uuid("ID d'agriculteur invalide")
})

// Schema for individual box in bulk operation (without farmerId)
export const createBoxItemSchema = z.object({
  id: z.string().min(1, "L'ID de la boîte est requis"),
  type: z.enum(['nchira', 'chkara', 'normal'], {
    required_error: "Le type de boîte est requis",
  }),
  weight: z.number().min(0.1, "Le poids doit être supérieur à 0").optional()
})

export const bulkCreateBoxSchema = z.object({
  boxes: z.array(createBoxItemSchema).min(1, "Au moins une boîte est requise").max(50, "Maximum 50 boîtes à la fois")
})

export const updateBoxSchema = z.object({
  id: z.string().min(1, "L'ID de la boîte est requis").optional(),
  type: z.enum(['nchira', 'chkara', 'normal'], {
    required_error: "Le type de boîte est requis",
  }).optional(),
  weight: z.number().min(0.1, "Le poids doit être supérieur à 0").nullable().optional()
})

// Box ID validation
export const validateBoxIdSchema = z.object({
  id: z.string().min(1, "L'ID de la boîte est requis"),
  type: z.enum(['nchira', 'chkara', 'normal']),
  excludeBoxId: z.string().optional()
})

// Processing Session validation schemas
export const createSessionSchema = z.object({
  farmerId: z.string().uuid("ID d'agriculteur invalide"),
  boxIds: z.array(z.string()).min(1, "Au moins une boîte est requise"),
  totalBoxWeight: z.number().min(0.1, "Le poids total doit être supérieur à 0"),
  boxCount: z.number().int().min(1, "Le nombre de boîtes doit être supérieur à 0"),
  totalPrice: z.number().min(0, "Le prix total ne peut pas être négatif")
})

export const completeSessionSchema = z.object({
  oilWeight: z.number().min(0, "Le poids d'huile ne peut pas être négatif"),
  processingDate: z.string().refine((date) => {
    const parsedDate = new Date(date)
    return !isNaN(parsedDate.getTime())
  }, "Date de traitement invalide"),
  paymentDate: z.string().optional().refine((date) => {
    if (!date) return true // Optional field
    const parsedDate = new Date(date)
    return !isNaN(parsedDate.getTime())
  }, "Date de paiement invalide")
})

export const updateSessionSchema = z.object({
  oilWeight: z.number().min(0).optional(),
  processingDate: z.string().optional(),
  notes: z.string().max(1000, "Les notes ne peuvent pas dépasser 1000 caractères").optional(),
  processingStatus: z.enum(['pending', 'processed']).optional(),
  paymentStatus: z.enum(['unpaid', 'paid', 'pending']).optional()
})

// Query parameter schemas
export const farmersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  type: z.enum(['all', 'small', 'large']).default('all'),
  paymentStatus: z.enum(['all', 'paid', 'pending', 'unpaid']).default('all'),
  sortBy: z.enum(['name', 'dateAdded', 'totalAmountDue', 'type']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  includeBoxes: z.coerce.boolean().default(false),
  includeSessions: z.coerce.boolean().default(false)
})

export const boxesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  farmerId: z.string().uuid().optional(),
  type: z.enum(['all', 'nchira', 'chkara', 'normal']).default('all'),
  status: z.enum(['AVAILABLE', 'IN_USE', 'all']).optional(),
  isSelected: z.coerce.boolean().optional(),
  sortBy: z.enum(['id', 'weight', 'type', 'createdAt']).default('id'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  includeCurrentFarmer: z.coerce.boolean().default(false)
})

export const sessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(10000).default(10),
  farmerId: z.string().uuid().optional(),
  processingStatus: z.enum(['all', 'pending', 'processed']).default('all'),
  paymentStatus: z.enum(['all', 'unpaid', 'paid', 'pending']).default('all'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'processingDate', 'totalPrice', 'sessionNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeFarmer: z.coerce.boolean().default(false),
  includeBoxes: z.coerce.boolean().default(false)
})

// Dashboard query schema
export const dashboardQuerySchema = z.object({
  date: z.string().optional(),
  refresh: z.coerce.boolean().default(false)
})

// Generic ID validation
export const uuidSchema = z.string().uuid("ID invalide")

// Bulk selection schema
export const bulkSelectionSchema = z.object({
  boxIds: z.array(z.string()).min(1, "Au moins une boîte doit être sélectionnée"),
  action: z.enum(['select', 'unselect', 'delete'])
})
