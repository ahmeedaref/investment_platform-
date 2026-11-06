-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ApprovalVote" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "approvalGroup" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "decidedByKeycloakId" TEXT NOT NULL,
    "processTaskId" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalVote_processTaskId_key" ON "ApprovalVote"("processTaskId");

-- CreateIndex
CREATE INDEX "ApprovalVote_decidedByKeycloakId_idx" ON "ApprovalVote"("decidedByKeycloakId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalVote_investmentId_approvalGroup_key" ON "ApprovalVote"("investmentId", "approvalGroup");

-- AddForeignKey
ALTER TABLE "ApprovalVote" ADD CONSTRAINT "ApprovalVote_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
