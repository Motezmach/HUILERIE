-- CreateEnum
CREATE TYPE "public"."FarmerType" AS ENUM ('SMALL', 'LARGE');

-- CreateEnum
CREATE TYPE "public"."BoxType" AS ENUM ('NCHIRA', 'CHKARA', 'NORMAL');

-- CreateEnum
CREATE TYPE "public"."BoxStatus" AS ENUM ('AVAILABLE', 'IN_USE');

-- CreateEnum
CREATE TYPE "public"."ProcessingStatus" AS ENUM ('PENDING', 'PROCESSED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'USER', 'MANAGER');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."farmers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "phone" TEXT,
    "type" "public"."FarmerType" NOT NULL DEFAULT 'SMALL',
    "pricePerKg" DECIMAL(65,30),
    "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmountDue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalAmountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "lastProcessingDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."boxes" (
    "id" TEXT NOT NULL,
    "type" "public"."BoxType" NOT NULL DEFAULT 'NORMAL',
    "status" "public"."BoxStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currentFarmerId" TEXT,
    "currentWeight" DECIMAL(65,30),
    "assignedAt" TIMESTAMP(3),
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."processing_sessions" (
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
    "processingStatus" "public"."ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session_boxes" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "boxWeight" DECIMAL(65,30) NOT NULL,
    "boxType" "public"."BoxType" NOT NULL,
    "farmerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_transactions" (
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
CREATE TABLE "public"."dashboard_metrics" (
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

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "processing_sessions_sessionNumber_key" ON "public"."processing_sessions"("sessionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "session_boxes_sessionId_boxId_key" ON "public"."session_boxes"("sessionId", "boxId");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_metrics_metricDate_key" ON "public"."dashboard_metrics"("metricDate");

-- AddForeignKey
ALTER TABLE "public"."boxes" ADD CONSTRAINT "boxes_currentFarmerId_fkey" FOREIGN KEY ("currentFarmerId") REFERENCES "public"."farmers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."processing_sessions" ADD CONSTRAINT "processing_sessions_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."farmers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_boxes" ADD CONSTRAINT "session_boxes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."processing_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_boxes" ADD CONSTRAINT "session_boxes_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "public"."boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_transactions" ADD CONSTRAINT "payment_transactions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."processing_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
