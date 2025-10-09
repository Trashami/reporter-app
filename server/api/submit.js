import { readBody } from 'h3'
import { promises as fs } from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Path to your JSON file
  const filePath = path.resolve('data/sample-data.json')

  // Read current data
  const fileData = await fs.readFile(filePath, 'utf-8')
  const reports = JSON.parse(fileData)

  // Assign a new ID
  const newId = reports.length ? reports[reports.length - 1].id + 1 : 1
  const newReport = {
    id: newId,
    name: body.name || body.location || "Untitled Report",
    type: body.type || body.condition || "Unknown",
    submittedBy: body.submittedBy || "anonymous@example.com",
    date: new Date().toISOString().split('T')[0], // today's date
  }

  // Push new entry
  reports.push(newReport)

  // Write back to file
  await fs.writeFile(filePath, JSON.stringify(reports, null, 2))

  return {
    status: 'ok',
    message: 'Report submitted successfully!',
    received: newReport,
  }
})
