import Link from 'next/link'

export default function Home() {
  return (
    <div className="px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Study Sharper
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your AI-powered study assistant for better learning and productivity
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            href="/auth/signup"
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Sign Up
          </Link>
          <Link
            href="/auth/login"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Log In
          </Link>
        </div>

        {/* Test Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">🧪 Test the Application</h3>
          <p className="text-blue-800 mb-4">
            Ready to try Study Sharper? Use these test credentials:
          </p>
          <div className="bg-white rounded p-4 border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong className="text-gray-700">Email:</strong>
                <div className="font-mono text-blue-600">test@example.com</div>
              </div>
              <div>
                <strong className="text-gray-700">Password:</strong>
                <div className="font-mono text-blue-600">Test123!</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                <strong>Instructions:</strong> Click "Sign Up" → "Load Test Data" → "Create account" → You'll see "Welcome, Test! Let's Get Started!"
              </p>
            </div>
          </div>
          <div className="mt-4 text-sm text-blue-700">
            <p><strong>Alternative test emails:</strong></p>
            <p>• test@test.com</p>
            <p>• demo@example.com</p>
            <p>• user@localhost</p>
          </div>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Notes</h3>
          <p className="text-gray-600">
            Organize and summarize your notes with AI-powered assistance
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Study Guides</h3>
          <p className="text-gray-600">
            Generate personalized study guides based on your syllabus and notes
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Spaced Repetition</h3>
          <p className="text-gray-600">
            Optimize your learning with scientifically-backed spaced repetition
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Audio Transcription</h3>
          <p className="text-gray-600">
            Upload lecture audio and get AI-powered interactive summaries
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Reminders</h3>
          <p className="text-gray-600">
            Never miss a deadline with smart reminders and notifications
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Progress Tracking</h3>
          <p className="text-gray-600">
            Track your learning progress and identify areas for improvement
          </p>
        </div>
      </div>
    </div>
  )
}
