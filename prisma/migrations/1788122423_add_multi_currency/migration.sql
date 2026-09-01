-- AlterTable
ALTER TABLE `Currency` ADD COLUMN `isDefault` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Cases` ADD COLUMN `currencyId` INT NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX `Cases_currencyId_idx` ON `Cases`(`currencyId`);

-- AddForeignKey
ALTER TABLE `Cases` ADD CONSTRAINT `Cases_currencyId_fkey` FOREIGN KEY (`currencyId`) REFERENCES `Currency`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
