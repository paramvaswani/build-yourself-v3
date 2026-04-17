export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ connected: !!process.env.ANTHROPIC_API_KEY });
}
