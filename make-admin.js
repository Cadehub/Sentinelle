import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wcrkcuugancklxirqfyl.supabase.co'
const supabaseKey = 'sb_publishable_ccvNj5ojFxa0nZ4F0c8zgw_VIhwv34O'

const supabase = createClient(supabaseUrl, supabaseKey)

const email = 'ethanbiteckbdbec@gmail.com'

async function makeAdmin() {
  try {
    console.log(`🔄 Mise à jour du rôle pour ${email}...`)

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('email', email)
      .select()

    if (error) {
      console.error('❌ Erreur:', error.message)
      process.exit(1)
    }

    if (data && data.length > 0) {
      console.log('✅ Succès! Profil mis à jour:')
      console.log(`   Email: ${data[0].email}`)
      console.log(`   Rôle: ${data[0].role}`)
      console.log('\n💡 Recharge l\'app pour voir les changements.')
    } else {
      console.log('⚠️  Aucun profil trouvé avec cet email.')
    }
  } catch (err) {
    console.error('❌ Erreur:', err.message)
    process.exit(1)
  }
}

makeAdmin()
