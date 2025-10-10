// Quick test script to verify Supabase connection
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://yicmvsmebwfbvxudyfbg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpY212c21lYndmYnZ4dWR5ZmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NTIwMzEsImV4cCI6MjA3NDQyODAzMX0.UAt3E9XBgtM4b2ysEEqTLWRAm3E-g6NsQuKri86o4gk'

console.log('Testing Supabase connection...')
console.log('URL:', supabaseUrl)
console.log('Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

async function testConnection() {
  try {
    console.log('\n1. Testing basic connection...')
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error) {
      console.error('❌ Connection error:', error)
    } else {
      console.log('✅ Connection successful!')
    }

    console.log('\n2. Testing auth endpoint...')
    const { data: authData, error: authError } = await supabase.auth.getSession()
    if (authError) {
      console.error('❌ Auth error:', authError)
    } else {
      console.log('✅ Auth endpoint accessible')
      console.log('   Current session:', authData.session ? 'Active' : 'None')
    }

    console.log('\n3. Testing sign in with invalid credentials (should return error)...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'wrongpassword'
    })
    
    if (signInError) {
      console.log('✅ Auth is working (expected error):', signInError.message)
    } else {
      console.log('❓ Unexpected: Login succeeded with invalid credentials')
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

testConnection().then(() => {
  console.log('\n✅ All tests completed!')
  process.exit(0)
}).catch(err => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
