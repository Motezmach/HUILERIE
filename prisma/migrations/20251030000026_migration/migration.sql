-- CreateEnum
CREATE TYPE "FarmerType" AS ENUM ('SMALL', 'LARGE');

-- CreateEnum
CREATE TYPE "BoxType" AS ENUM ('NCHIRA', 'CHKARA', 'NORMAL');

-- CreateEnum
CREATE TYPE "BoxStatus" AS ENUM ('AVAILABLE', 'IN_USE');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'PENDING');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'MANAGER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('FARMER_PAYMENT', 'DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "phone" TEXT,
    "type" "FarmerType" NOT NULL DEFAULT 'SMALL',
    "pricePerKg" DECIMAL(65,30),
    "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmountDue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalAmountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "lastProcessingDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boxes" (
    "id" TEXT NOT NULL,
    "type" "BoxType" NOT NULL DEFAULT 'NORMAL',
    "status" "BoxStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currentFarmerId" TEXT,
    "currentWeight" DECIMAL(65,30),
    "assignedAt" TIMESTAMP(3),
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_sessions" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "sessionNumber" TEXT NOT NULL,
    "processingDate" TIMESTAMP(3),
    "oilWeight" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalBoxWeight" DECIMAL(65,30) NOT NULL,
    "boxCount" INTEGER NOT NULL,
    "totalPrice" DECIMAL(65,30),
    "pricePerKg" DECIMAL(65,30),
    "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_boxes" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "boxWeight" DECIMAL(65,30) NOT NULL,
    "boxType" "BoxType" NOT NULL,
    "farmerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_metrics" (
    "id" TEXT NOT NULL,
    "metricDate" TIMESTAMP(3) NOT NULL,
    "totalFarmers" INTEGER NOT NULL DEFAULT 0,
    "totalBoxes" INTEGER NOT NULL DEFAULT 0,
    "activeBoxes" INTEGER NOT NULL DEFAULT 0,
    "pendingExtractions" INTEGER NOT NULL DEFAULT 0,
    "todayRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "averageOilExtraction" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oil_safes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" DECIMAL(65,30) NOT NULL,
    "currentStock" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oil_safes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "olive_purchases" (
    "id" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "farmerName" TEXT NOT NULL,
    "farmerPhone" TEXT,
    "oliveWeight" DECIMAL(65,30) NOT NULL,
    "pricePerKg" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "oilProduced" DECIMAL(65,30),
    "yieldPercentage" DECIMAL(65,30),
    "safeId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "olive_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oil_sales" (
    "id" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "safeId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "pricePerKg" DECIMAL(65,30) NOT NULL,
    "totalRevenue" DECIMAL(65,30) NOT NULL,
    "buyer" TEXT,
    "buyerPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oil_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "farmerName" TEXT,
    "farmerId" TEXT,
    "sessionId" TEXT,
    "destination" TEXT,
    "createdBy" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "processing_sessions_sessionNumber_key" ON "processing_sessions"("sessionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "session_boxes_sessionId_boxId_key" ON "session_boxes"("sessionId", "boxId");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_metrics_metricDate_key" ON "dashboard_metrics"("metricDate");

-- CreateIndex
CREATE UNIQUE INDEX "oil_safes_name_key" ON "oil_safes"("name");

-- AddForeignKey
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_currentFarmerId_fkey" FOREIGN KEY ("currentFarmerId") REFERENCES "farmers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_sessions" ADD CONSTRAINT "processing_sessions_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_boxes" ADD CONSTRAINT "session_boxes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "processing_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_boxes" ADD CONSTRAINT "session_boxes_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "processing_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "olive_purchases" ADD CONSTRAINT "olive_purchases_safeId_fkey" FOREIGN KEY ("safeId") REFERENCES "oil_safes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oil_sales" ADD CONSTRAINT "oil_sales_safeId_fkey" FOREIGN KEY ("safeId") REFERENCES "oil_safes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
