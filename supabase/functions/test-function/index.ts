import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req: Request): Promise<Response> => {
  return new Response(JSON.stringify({
    message: 'Test function working!',
    method: req.method,
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(req.headers.entries())
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
});