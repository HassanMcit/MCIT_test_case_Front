import { StitchToolClient } from "@google/stitch-sdk";

const API_KEY    = "AQ.Ab8RN6KdLwX7b5gCdNvrT-EPHqtK8FwnK1TEfPjx68E97RZxOQ";
const PROJECT_ID = "11265528875641588474";

const client = new StitchToolClient({ apiKey: API_KEY });

try {
  const resp = await client.callTool("list_screens", { projectId: PROJECT_ID });
  console.log(JSON.stringify(resp, null, 2));
} catch (err) {
  console.error("ERROR:", err.message);
} finally {
  await client.close();
}
