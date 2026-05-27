import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apiKey, content-type',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Jeton de connexion manquant' }), { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Utilisateur non autorisé' }), { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
    }

    const { id } = await req.json()

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID de l\'alerte manquant' }), { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
    }

    // Vérifier que l'utilisateur est bien l'auteur
    const { data: alert, error: fetchError } = await supabaseClient
      .from('alerts')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !alert) {
      return new Response(JSON.stringify({ error: 'Alerte non trouvée' }), { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
    }

    if (alert.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Vous n\'êtes pas autorisé à supprimer cette alerte' }), { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
    }

    // Supprimer l'alerte
    const { error: deleteError } = await supabaseClient
      .from('alerts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return new Response(JSON.stringify({ success: true, message: 'Alerte supprimée avec succès' }), { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('[delete-alert]', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
  }
})
