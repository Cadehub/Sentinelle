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
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, DELETE',
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

    // Extraire user_id du JWT
    const token = authHeader.replace('Bearer ', '')
    let userId: string
    try {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('Invalid JWT')
      const decoded = JSON.parse(atob(parts[1]))
      userId = decoded.sub
      if (!userId) throw new Error('No sub in JWT')
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Jeton invalide' }), { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { id, title, description, type, city, neighborhood, contact, duration_days, status } = await req.json()

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

    if (alert.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Vous n\'êtes pas autorisé à modifier cette alerte' }), { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
    }

    // Correction via Gemini si description modifiée
    let correctedDescription = description
    let detectedType = type
    if (description) {
      const geminiKey = Deno.env.get('GEMINI_API_KEY')
      if (geminiKey) {
        try {
          const geminiModerationPrompt = `Tu es un modérateur et correcteur pour "Sentinelle" (application d'alerte citoyenne).

TÂCHES:
1. MODÉRATION: Si le texte contient des insultes, menaces, harcèlement ou contenu haineux (peu importe la langue), réponds EXACTEMENT "REJECT"
2. CORRECTION: Sinon, corrige discrètement TOUTES les fautes d'orthographe et grammaire (français ET anglais)
3. TYPE_DÉTECTION: Détecte automatiquement le type d'alerte selon le contenu (détection: Vol, Perte, Objet Trouvé, Agression, Accident, Urgence Médicale, Incendie, Kidnapping, Drame, Autre)

RÉPONSE: JSON uniquement sur UNE SEULE LIGNE
{
  "status": "approved" ou "rejected",
  "corrected_text": "texte corrigé" (ou texte original si aucune correction),
  "detected_type": "type détecté" (ex: Vol, Agression, etc),
  "reason": "raison si rejeté"
}

TEXTE À ANALYSER:
Title: "${title || ''}"
Description: "${description}"
Type soumis: "${type}"
Quartier: "${neighborhood}"
Ville: "${city}"`

          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiModerationPrompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
            })
          })

          const geminiData = await geminiRes.json()
          
          if (!geminiRes.ok || !geminiData.candidates || !geminiData.candidates[0]) {
            console.error('[update-alert] Gemini error:', geminiData)
            // Continue sans modération si Gemini échoue
          } else {
            const geminiResponse = geminiData.candidates[0].content.parts[0].text.trim()
            
            try {
              const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                const moderationResult = JSON.parse(jsonMatch[0])
                
                if (moderationResult.status === 'rejected') {
                  return new Response(JSON.stringify({ error: `Contenu inapproprié: ${moderationResult.reason}` }), { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
                }
                
                correctedDescription = moderationResult.corrected_text || description
                detectedType = moderationResult.detected_type || type
              }
            } catch (parseErr) {
              console.warn('[update-alert] JSON parse error:', parseErr)
              // Continue with original values
            }
          }
        } catch (err) {
          console.warn('[update-alert] Gemini error:', err)
          // Continue without Gemini correction
        }
      }
    }

    // Calculer la nouvelle date d'expiration si duration_days est fourni
    let expiresAt = undefined
    if (duration_days) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(duration_days))
      expiresAt = expiresAt.toISOString()
    }

    // Préparer les données à mettre à jour
    const updateData: any = {}
    if (title) updateData.title = title
    if (correctedDescription) updateData.description = correctedDescription
    if (detectedType) updateData.type = detectedType
    if (city) updateData.city = city
    if (neighborhood) updateData.neighborhood = neighborhood
    if (contact) updateData.contact = contact
    if (expiresAt) updateData.expires_at = expiresAt
    if (status) updateData.status = status

    if (Object.keys(updateData).length === 0) {
      return new Response(JSON.stringify({ error: 'Aucune donnée à mettre à jour' }), { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
    }

    // Mettre à jour l'alerte
    const { data: updatedAlert, error: updateError } = await supabaseClient
      .from('alerts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return new Response(JSON.stringify({ success: true, alert: updatedAlert }), { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('[update-alert]', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
  }
})
