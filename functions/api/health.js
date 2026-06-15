// Health check endpoint
// GET /api/health

export async function onRequestGet() {
  try {
    return Response.json({
      ok: true,
      service: 'byteforge-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error.message,
    }, { status: 500 });
  }
}
