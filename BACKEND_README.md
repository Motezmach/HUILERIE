# HUILERIE MASMOUDI - Backend API Specifications

## 🏗️ Architecture Overview

This document provides comprehensive specifications for building the backend API for the HUILERIE MASMOUDI olive oil factory management system. The backend should be built using **Next.js 14 App Router API Routes** with **TypeScript**, **Prisma ORM**, and **PostgreSQL/MySQL**.

## 📋 Technology Stack

### Core Technologies
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL (primary) or MySQL
- **ORM**: Prisma
- **Validation**: Zod
- **Authentication**: NextAuth.js (future)
- **File Upload**: Multer/FormData
- **PDF Generation**: jsPDF/Puppeteer
- **Email**: Nodemailer (future)

### Project Structure
\`\`\`
/api/
├── farmers/
│   ├── route.ts                 # GET, POST /api/farmers
│   ├── [id]/
│   │   ├── route.ts             # GET, PUT, DELETE /api/farmers/[id]
│   │   └── boxes/
│   │       └── route.ts         # GET, POST /api/farmers/[id]/boxes
├── boxes/
│   ├── route.ts                 # GET, POST /api/boxes
│   ├── [id]/
│   │   └── route.ts             # GET, PUT, DELETE /api/boxes/[id]
│   ├── bulk/
│   │   └── route.ts             # POST /api/boxes/bulk
│   └── validate/
│       └── route.ts             # POST /api/boxes/validate
├── sessions/
│   ├── route.ts                 # GET, POST /api/sessions
│   ├── [id]/
│   │   ├── route.ts             # GET, PUT, DELETE /api/sessions/[id]
│   │   ├── complete/
│   │   │   └── route.ts         # PUT /api/sessions/[id]/complete
│   │   ├── payment/
│   │   │   └── route.ts         # PUT /api/sessions/[id]/payment
│   │   └── invoice/
│   │       └── route.ts         # GET /api/sessions/[id]/invoice
├── dashboard/
│   └── route.ts                 # GET /api/dashboard
├── reports/
│   ├── route.ts                 # GET /api/reports
│   ├── farmers/
│   │   └── route.ts             # GET /api/reports/farmers
│   └── sessions/
│       └── route.ts             # GET /api/reports/sessions
└── health/
    └── route.ts                 # GET /api/health
\`\`\`

## 🗄️ Database Integration

### Prisma Setup
\`\`\`typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // or "mysql"
  url      = env("DATABASE_URL")
}

model Farmer {
  id                   String             @id @default(uuid())
  name                 String
  phone                String?
  type                 FarmerType         @default(SMALL)
  pricePerKg           Decimal            @default(0.15)
  dateAdded            DateTime           @default(now())
  totalAmountDue       Decimal            @default(0)
  totalAmountPaid      Decimal            @default(0)
  paymentStatus        PaymentStatus      @default(PENDING)
  lastProcessingDate   DateTime?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  
  boxes                Box[]
  processingSessions   ProcessingSession[]
  
  @@map("farmers")
}

model Box {
  id                   String             @id
  farmerId             String
  type                 BoxType            @default(NORMAL)
  weight               Decimal
  isSelected           Boolean            @default(false)
  isProcessed          Boolean            @default(false)
  processingSessionId  String?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  
  farmer               Farmer             @relation(fields: [farmerId], references: [id], onDelete: Cascade)
  processingSession    ProcessingSession? @relation(fields: [processingSessionId], references: [id])
  sessionBoxes         SessionBox[]
  
  @@map("boxes")
}

model ProcessingSession {
  id                   String             @id @default(uuid())
  farmerId             String
  sessionNumber        String             @unique
  processingDate       DateTime?
  oilWeight            Decimal            @default(0)
  totalBoxWeight       Decimal
  boxCount             Int
  totalPrice           Decimal
  processingStatus     ProcessingStatus   @default(PENDING)
  paymentStatus        PaymentStatus      @default(UNPAID)
  paymentDate          DateTime?
  notes                String?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  
  farmer               Farmer             @relation(fields: [farmerId], references: [id], onDelete: Cascade)
  boxes                Box[]
  sessionBoxes         SessionBox[]
  
  @@map("processing_sessions")
}

model SessionBox {
  id                   String             @id @default(uuid())
  sessionId            String
  boxId                String
  boxWeight            Decimal
  boxType              BoxType
  createdAt            DateTime           @default(now())
  
  session              ProcessingSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  box                  Box                @relation(fields: [boxId], references: [id], onDelete: Cascade)
  
  @@unique([sessionId, boxId])
  @@map("session_boxes")
}

enum FarmerType {
  SMALL
  LARGE
}

enum BoxType {
  NCHIRA
  CHKARA
  NORMAL
}

enum ProcessingStatus {
  PENDING
  PROCESSED
}

enum PaymentStatus {
  UNPAID
  PAID
  PENDING
}
\`\`\`

## 🔌 API Endpoints Specifications

### 1. Farmers Management

#### GET /api/farmers
**Purpose**: Retrieve all farmers with filtering and pagination
\`\`\`typescript
// Query Parameters
interface FarmersQuery {
  page?: number          // Default: 1
  limit?: number         // Default: 10, Max: 100
  search?: string        // Search by name
  type?: 'small' | 'large' | 'all'  // Default: 'all'
  paymentStatus?: 'paid' | 'pending' | 'all'  // Default: 'all'
  sortBy?: 'name' | 'dateAdded' | 'totalAmountDue'  // Default: 'name'
  sortOrder?: 'asc' | 'desc'  // Default: 'asc'
  includeBoxes?: boolean // Default: false
  includeSessions?: boolean // Default: false
}

// Response
interface FarmersResponse {
  success: boolean
  data: {
    farmers: Farmer[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
  message?: string
}

// Implementation Example
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || 'all'
    const paymentStatus = searchParams.get('paymentStatus') || 'all'
    const includeBoxes = searchParams.get('includeBoxes') === 'true'
    const includeSessions = searchParams.get('includeSessions') === 'true'

    const where: any = {}
    
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }
    
    if (type !== 'all') {
      where.type = type.toUpperCase()
    }
    
    if (paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus.toUpperCase()
    }

    const [farmers, total] = await Promise.all([
      prisma.farmer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          boxes: includeBoxes,
          processingSessions: includeSessions
        },
        orderBy: { name: 'asc' }
      }),
      prisma.farmer.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        farmers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch farmers' },
      { status: 500 }
    )
  }
}
\`\`\`

#### POST /api/farmers
**Purpose**: Create a new farmer
\`\`\`typescript
// Request Body
interface CreateFarmerRequest {
  name: string           // Required, 2-100 characters
  phone?: string         // Optional, valid phone format
  type: 'small' | 'large'  // Required
}

// Validation Schema
const createFarmerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^[\+]?[0-9\s\-$$$$]+$/).optional(),
  type: z.enum(['small', 'large'])
})

// Response
interface CreateFarmerResponse {
  success: boolean
  data?: Farmer
  message?: string
  error?: string
}

// Implementation
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = createFarmerSchema.parse(body)
    
    const pricePerKg = validatedData.type === 'large' ? 0.20 : 0.15
    
    const farmer = await prisma.farmer.create({
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        type: validatedData.type.toUpperCase() as FarmerType,
        pricePerKg
      }
    })

    return NextResponse.json({
      success: true,
      data: farmer,
      message: 'Farmer created successfully'
    }, { status: 201 })
  } catch
