'use client'

interface StreakTrackerProps {
  streakDays: number
}

export function StreakTracker({ streakDays }: StreakTrackerProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-xl shadow-lg p-6 text-white">
      {/* Animated flame decorations */}
      <div className="absolute top-2 right-2 opacity-10">
        <div className="text-8xl animate-pulse">🔥</div>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <span className="mr-2">🔥</span>
            Study Streak
          </h3>
          {streakDays >= 7 && (
            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold">
              On Fire! 🚀
            </span>
          )}
        </div>
        
        <div className="flex items-baseline mb-2">
          <div className="text-5xl font-bold">{streakDays}</div>
          <div className="text-xl ml-2 opacity-90">
            {streakDays === 1 ? 'day' : 'days'}
          </div>
        </div>
        
        <p className="text-orange-100 text-sm">
          {streakDays === 0 
            ? "Start your streak today!" 
            : streakDays < 7
            ? "Keep it up! You're building momentum."
            : "Amazing dedication! Keep the fire burning! 🎉"}
        </p>
        
        {/* Visual streak dots for last 7 days */}
        <div className="flex items-center space-x-2 mt-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                i < Math.min(streakDays, 7)
                  ? 'bg-white scale-110 shadow-lg'
                  : 'bg-white/30'
              }`}
              title={`Day ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
