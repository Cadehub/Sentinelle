import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { images } = await req.json()

    if (!images || images.length === 0) {
      return new Response(JSON.stringify({ error: 'No images provided' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const imgbbKey = Deno.env.get('IMGBB_API_KEY')
    if (!imgbbKey) {
      return new Response(JSON.stringify({ error: 'ImgBB API key not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
