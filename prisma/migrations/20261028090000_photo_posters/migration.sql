CREATE TABLE "PhotoPoster" (
  "sourcePath" TEXT NOT NULL,
  "posterPath" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhotoPoster_pkey" PRIMARY KEY ("sourcePath")
);
CREATE UNIQUE INDEX "PhotoPoster_posterPath_key" ON "PhotoPoster"("posterPath");
ALTER TABLE public."PhotoPoster" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."PhotoPoster" FROM anon, authenticated, PUBLIC;
