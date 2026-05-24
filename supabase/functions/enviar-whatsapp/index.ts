import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ULTRAMSG_INSTANCE = 'instance177408'
const ULTRAMSG_TOKEN = '7etqzwfh3gsrxzu0'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { numero, mensagem } = await req.json()

    const response = await fetch(
      `https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: ULTRAMSG_TOKEN,
          to: numero,
          body: mensagem,
          priority: '10'
        })
      }
    )

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
})