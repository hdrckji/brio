-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "countsInSlotLimit" BOOLEAN NOT NULL DEFAULT true;

-- Les truffes ne comptent pas dans la limite d'articles par créneau (modifiable dans la fiche produit).
UPDATE "Product" SET "countsInSlotLimit" = false WHERE "name" ILIKE '%truffe%';
