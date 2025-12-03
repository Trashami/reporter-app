import { defineEventHandler, readBody } from "h3";
import { promises as fs } from "fs";
import path from "path";

export default defineEventHandler(async (event) => {
  // Slurp the request body into existence.
  // Caller should be sending some kind of report-ish payload.
  const body = await readBody(event);

  // Path to your JSON "database":
  // an honorable little file doing its best to be Postgres.
  const filePath = path.resolve("data/sample-data.json");

  // Read the current contents of our pretend DB.
  const fileData = await fs.readFile(filePath, "utf-8");
  const reports = JSON.parse(fileData);

  // Assign a new ID:
  //  - if we have existing reports, use last.id + 1
  //  - otherwise start at 1 like it’s day one of the apocalypse
  const newId = reports.length ? reports[reports.length - 1].id + 1 : 1;

  // Build a new report object from whatever the caller managed to send.
  // We’re generous with fallbacks because real users are chaos.
  const newReport = {
    id: newId,
    name: body.name || body.location || "Untitled Report", // something vaguely human-readable
    type: body.type || body.condition || "Unknown", // what *kind* of thing is this, allegedly
    submittedBy: body.submittedBy || "anonymous@example.com", // anonymous hero or forgot-the-field developer
    date: new Date().toISOString().split("T")[0], // today’s date in YYYY-MM-DD, no time drama
  };

  // Append the new report to our in-memory array
  // (soon to be immortalized back into the JSON “DB”).
  reports.push(newReport);

  // Write everything back to disk with pretty indentation
  // because even fake databases deserve to be readable.
  await fs.writeFile(filePath, JSON.stringify(reports, null, 2));

  // Return a tiny success envelope so the frontend knows it worked
  // and can show the user something reassuring instead of silence.
  return {
    status: "ok",
    message: "Report submitted successfully!",
    received: newReport,
  };
});
