import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image, name } = await req.json()
    const apiKey = Deno.env.get('IMGBB_API_KEY')

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Le secret IMGBB_API_KEY est manquant sur Supabase' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    if (!image) {
      return new Response(JSON.stringify({ error: 'Aucune image fournie' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Convertir le base64 en Blob
    const binaryString = atob(image)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' })

    // Préparer la FormData pour ImgBB
    const imgBbFormData = new FormData()
    imgBbFormData.append('image', blob, name || 'image.jpg')

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: imgBbFormData,
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      return new Response(JSON.stringify({ error: result.error?.message || 'Echec upload ImgBB' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    return new Response(JSON.stringify({ url: result.data.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
