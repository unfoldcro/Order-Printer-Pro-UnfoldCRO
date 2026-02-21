import { processJob } from "./app/lib/worker.server.js";
import { db } from "./app/db.server.js";

async function runWorker() {
  console.log("Worker started, polling for jobs...");
  while (true) {
    const job = await db.job.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });

    if (job) {
      console.log(`Processing job ${job.id} (${job.type})`);
      await processJob(job.id);
    } else {
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

runWorker().catch(console.error);
