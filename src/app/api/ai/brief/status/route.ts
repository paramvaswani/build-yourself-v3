export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ connected: !!process.env.GEMINI_API_KEY });
}
