import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://10.195.25.254:3000',
  'https://sentinelle-v1.netlify.app',
  'https://sentinelle.com',
  'https://www.sentinelle.com'
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin")
  const allowOrigin = ALLOWED_ORIGINS.includes(origin || '') ? origin! : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, DELETE',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apiKey, content-type',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const { images } = await req.json()

    if (!images || images.length === 0) {
      return new Response(JSON.stringify({ error: 'No images provided' }), { 
        status: 400, 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
      })
    }

    const imgbbKey = Deno.env.get('IMGBB_API_KEY')
    if (!imgbbKey) {
      return new Response(JSON.stringify({ error: 'ImgBB API key not configured' }), { 
        status: 500, 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
      })
    }

    const uploadedImages: string[] = []

    for (const base64 of images) {
      const formData = new FormData()
      formData.append('image', base64.split(',')[1])

      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: 'POST',
        body: formData,
      })

      if (!imgbbRes.ok) {
        console.error(`ImgBB upload failed: ${imgbbRes.statusText}`)
        continue
      }

      const imgbbData = await imgbbRes.json()
      uploadedImages.push(imgbbData.data.url)
    }

    return new Response(JSON.stringify({ urls: uploadedImages }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
