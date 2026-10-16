-- How an update was acknowledged: on the party's own account, or in person on the
-- agent's phone. Nullable: earlier rows were all on the party's own account.
CREATE TYPE "AcknowledgementMethod" AS ENUM ('OWN_ACCOUNT', 'IN_PERSON');

ALTER TABLE "AddendumAcknowledgement" ADD COLUMN "method" "AcknowledgementMethod";
