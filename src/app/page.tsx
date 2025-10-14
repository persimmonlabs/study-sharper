import Link from 'next/link'

export default function Home() {
  return (
    <div className="px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Welcome to Study Sharper
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
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
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Log In
          </Link>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-gray-900/80 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Smart Notes</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Organize and summarize your notes with AI-powered assistance
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900/80 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Study Guides</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Generate personalized study guides based on your syllabus and notes
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900/80 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Spaced Repetition</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Optimize your learning with scientifically-backed spaced repetition
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900/80 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Audio Transcription</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Upload lecture audio and get AI-powered interactive summaries
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900/80 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Reminders</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Never miss a deadline with smart reminders and notifications
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900/80 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Progress Tracking</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Track your learning progress and identify areas for improvement
          </p>
        </div>
      </div>
    </div>
  )
}
