export default function Study() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Study Mode</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Create interactive flashcards for active recall learning. Additional study features coming soon!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Flashcards</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Create and review flashcards for active recall and spaced repetition learning.</p>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
            Create Flashcards
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">Spaced Repetition</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Coming Soon</p>
          <button className="bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg cursor-not-allowed">
            Coming Soon
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">Study Guides</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Coming Soon</p>
          <button className="bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg cursor-not-allowed">
            Coming Soon
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">Practice Tests</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Coming Soon</p>
          <button className="bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg cursor-not-allowed">
            Coming Soon
          </button>
        </div>
      </div>

      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-200 mb-2">Future Features</h3>
        <p className="text-primary-800 dark:text-primary-300">
          We&apos;re working on advanced study features including AI-powered spaced repetition, personalized study guides, and intelligent practice tests to enhance your learning experience.
        </p>
      </div>
    </div>
  )
}
