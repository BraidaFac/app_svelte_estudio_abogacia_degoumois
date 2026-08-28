-- Migration: decimal_and_schema_improvements
-- Converts Float → Decimal(12,4) for monetary fields, adds PaymentStatus enum,
-- adds Cases.caseNumber, adds index on Payment.due_date

-- AlterTable: Cases — drop legacy currency column
ALTER TABLE `Cases` DROP COLUMN `currency`;

-- AlterTable: Cases — add caseNumber, convert amount/restAmount double→Decimal(12,4)
ALTER TABLE `Cases`
    ADD COLUMN `caseNumber` VARCHAR(50) NULL,
    MODIFY COLUMN `amount` DECIMAL(12, 4) NOT NULL,
    MODIFY COLUMN `restAmount` DECIMAL(12, 4) NOT NULL;

-- CreateIndex: unique on caseNumber
CREATE UNIQUE INDEX `Cases_caseNumber_key` ON `Cases`(`caseNumber`);

-- CreateIndex: Cases restAmount
CREATE INDEX `Cases_restAmount_idx` ON `Cases`(`restAmount`);

-- RenameIndex: userId FK index → Prisma convention name
ALTER TABLE `Cases` RENAME INDEX `Cases_userId_fkey` TO `Cases_userId_idx`;

-- AlterTable: Payment — add status enum column, convert amount double→Decimal(12,4)
ALTER TABLE `Payment`
    ADD COLUMN `status` ENUM('PENDIENTE', 'PAGADA', 'VENCIDA') NOT NULL DEFAULT 'PENDIENTE',
    MODIFY COLUMN `amount` DECIMAL(12, 4) NULL;

-- CreateIndex: Payment composite (caseId, current)
CREATE INDEX `Payment_caseId_current_idx` ON `Payment`(`caseId`, `current`);

-- CreateIndex: Payment due_date
CREATE INDEX `Payment_due_date_idx` ON `Payment`(`due_date`);

-- AlterTable: Currency — convert value double→Decimal(12,4)
ALTER TABLE `Currency`
    MODIFY COLUMN `value` DECIMAL(12, 4) NOT NULL;

-- Backfill PaymentStatus for existing data
UPDATE `Payment` SET `status` = 'PAGADA' WHERE `payment_date` IS NOT NULL;
UPDATE `Payment` SET `status` = 'VENCIDA'
  WHERE `payment_date` IS NULL AND `due_date` < NOW();
