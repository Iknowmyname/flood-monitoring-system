import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { floodIngestQueue } from "./floodIngestQueue.js";

export function setupBullBoard(app: any) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [new BullMQAdapter(floodIngestQueue)],
    serverAdapter,
  });

  app.use("/admin/queues", serverAdapter.getRouter());
}
