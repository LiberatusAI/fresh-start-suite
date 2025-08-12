import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Read the chart.html file
    const file = await Deno.readTextFile('./chart.html');
    // Return the HTML file with CORS headers
    return new Response(file, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to read chart template'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
