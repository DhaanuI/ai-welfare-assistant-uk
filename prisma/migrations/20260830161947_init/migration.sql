-- CreateEnum
CREATE TYPE "Category" AS ENUM ('academic', 'financial', 'visa_immigration', 'housing', 'health_wellbeing', 'other');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "Disposition" AS ENUM ('handle_now', 'clarify', 'escalate');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('active', 'escalated', 'closed');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('student', 'assistant', 'system');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('new', 'in_progress', 'resolved');

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "studentName" TEXT,
    "studentEmail" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriageResult" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "urgency" "Urgency" NOT NULL,
    "safeguarding" BOOLEAN NOT NULL,
    "disposition" "Disposition" NOT NULL,
    "modelOk" BOOLEAN NOT NULL,
    "appliedRules" TEXT[],
    "reasoning" TEXT,
    "rawModel" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriageResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "urgency" "Urgency" NOT NULL,
    "safeguarding" BOOLEAN NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'new',
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "TriageResult_messageId_key" ON "TriageResult"("messageId");

-- CreateIndex
CREATE INDEX "TriageResult_conversationId_idx" ON "TriageResult"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Case_conversationId_key" ON "Case"("conversationId");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX "Case_safeguarding_urgency_idx" ON "Case"("safeguarding", "urgency");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageResult" ADD CONSTRAINT "TriageResult_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageResult" ADD CONSTRAINT "TriageResult_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
