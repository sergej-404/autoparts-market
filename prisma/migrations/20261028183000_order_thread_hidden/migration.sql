CREATE TABLE "order_thread_hidden" ("orderId" TEXT NOT NULL, "userId" TEXT NOT NULL, "hiddenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "order_thread_hidden_pkey" PRIMARY KEY ("orderId","userId"));
CREATE INDEX "order_thread_hidden_userId_idx" ON "order_thread_hidden"("userId");
ALTER TABLE "order_thread_hidden" ADD CONSTRAINT "order_thread_hidden_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
