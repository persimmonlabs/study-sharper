// Check user status in Supabase
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://yicmvsmebwfbvxudyfbg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpY212c21lYndmYnZ4dWR5ZmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NTIwMzEsImV4cCI6MjA3NDQyODAzMX0.UAt3E9XBgtM4b2ysEEqTLWRAm3E-g6NsQuKri86o4gk'
const email = 'owenreynolds5050@gmail.com'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkUser() {
  console.log('🔍 Checking user status for:', email)
  console.log('─'.repeat(60))

  try {
    // Try to sign in with a dummy password to check if user exists
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'dummy_password_123'
    })

    if (error) {
      console.log('\n📋 Error Message:', error.message)
      console.log('📋 Error Status:', error.status)
      console.log('📋 Error Name:', error.name)
      
      if (error.message.includes('Invalid login credentials')) {
        console.log('\n✅ USER EXISTS in Supabase')
        console.log('❌ But password is incorrect OR email not confirmed')
        console.log('\n💡 NEXT STEPS:')
        console.log('   1. Check your email inbox for Supabase verification email')
        console.log('   2. Click the verification link')
        console.log('   3. OR go to Supabase Dashboard > Authentication > Users')
        console.log('   4. Find your user and manually confirm the email')
        console.log('   5. OR use password reset feature on login page')
      } else if (error.message.includes('Email not confirmed')) {
        console.log('\n✅ USER EXISTS in Supabase')
        console.log('❌ Email NOT CONFIRMED yet')
        console.log('\n💡 SOLUTION:')
        console.log('   Check your email for verification link from Supabase')
        console.log('   OR manually confirm in Supabase Dashboard')
      } else if (error.message.includes('User not found') || error.message.includes('Invalid email')) {
        console.log('\n❌ USER DOES NOT EXIST')
        console.log('\n💡 SOLUTION:')
        console.log('   Create an account at: http://localhost:3000/auth/signup')
      } else {
        console.log('\n❓ UNKNOWN ERROR')
        console.log('   Check Supabase Dashboard for more details')
      }
    } else {
      console.log('\n🎉 UNEXPECTED: Login succeeded with dummy password!')
      console.log('   This should not happen - check Supabase auth settings')
    }

    // Try to get user info from profiles table (if accessible)
    console.log('\n🔍 Checking profiles table...')
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (profileError) {
      console.log('❌ Cannot query profiles:', profileError.message)
      console.log('   (This is expected without authentication)')
    } else if (profileData) {
      console.log('✅ Profile found in database:')
      console.log('   ID:', profileData.id)
      console.log('   Email:', profileData.email)
      console.log('   Name:', profileData.first_name, profileData.last_name)
    } else {
      console.log('ℹ️  No profile found in profiles table')
      console.log('   (Profile is created after first login)')
    }

  } catch (err) {
    console.error('\n❌ Unexpected error:', err)
  }

  console.log('\n' + '─'.repeat(60))
  console.log('📊 SUMMARY:')
  console.log('   Email:', email)
  console.log('   Supabase URL:', supabaseUrl)
  console.log('   \n   To fix authentication:')
  console.log('   1. Check email for verification link')
  console.log('   2. Use password reset on login page')
  console.log('   3. Check Supabase Dashboard > Authentication > Users')
  console.log('─'.repeat(60))
}

checkUser().then(() => {
  process.exit(0)
}).catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
