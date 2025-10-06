export default function Study() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Study Mode</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Optimize your learning with spaced repetition and smart study guides.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Spaced Repetition</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Review material at optimal intervals for maximum retention.</p>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
            Start Session
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Study Guides</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Generate personalized study guides based on your notes.</p>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
            Generate Guide
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Practice Tests</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Test your knowledge with AI-generated practice questions.</p>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
            Take Test
          </button>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">Coming Soon</h3>
        <p className="text-blue-800 dark:text-blue-300">
          Advanced study features including AI-powered content generation, progress analytics, and personalized learning paths are currently in development.
        </p>
      </div>
    </div>
  )
}
