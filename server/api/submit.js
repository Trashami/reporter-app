export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    console.log('Received fake submission:', body)
  
    return {
      status: 'ok',
      message: 'Report submitted successfully!',
      received: body,
    }
  })

  