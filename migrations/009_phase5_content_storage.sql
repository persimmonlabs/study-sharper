-- Phase 5: Content Storage and Session Management
-- Tables for storing generated content and managing conversation sessions

-- Conversation Sessions
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user ON conversation_sessions(user_id, last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_type ON conversation_sessions(session_type);

-- Conversation Messages
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_session ON conversation_messages(session_id, created_at);

-- Flashcards (if not exists)
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist
DO $$ 
BEGIN
    -- Add answer column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='flashcards' AND column_name='answer') THEN
        ALTER TABLE flashcards ADD COLUMN answer TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='flashcards' AND column_name='topic') THEN
        ALTER TABLE flashcards ADD COLUMN topic TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='flashcards' AND column_name='difficulty') THEN
        ALTER TABLE flashcards ADD COLUMN difficulty TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='flashcards' AND column_name='times_reviewed') THEN
        ALTER TABLE flashcards ADD COLUMN times_reviewed INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='flashcards' AND column_name='last_reviewed') THEN
        ALTER TABLE flashcards ADD COLUMN last_reviewed TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='flashcards' AND column_name='mastery_level') THEN
        ALTER TABLE flashcards ADD COLUMN mastery_level FLOAT DEFAULT 0.0;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON flashcards(topic);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    total_points INTEGER,
    estimated_time_minutes INTEGER,
    times_taken INTEGER DEFAULT 0,
    average_score FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_user ON quizzes(user_id, created_at DESC);

-- Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    question TEXT NOT NULL,
    options JSONB,
    correct_answer JSONB NOT NULL,
    explanation TEXT,
    points INTEGER DEFAULT 1,
    order_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id, order_index);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score FLOAT,
    total_points INTEGER,
    time_taken_minutes INTEGER,
    answers JSONB,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id, completed_at DESC);

-- Exams
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    duration_minutes INTEGER,
    total_points INTEGER,
    sections JSONB,
    times_taken INTEGER DEFAULT 0,
    average_score FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_user ON exams(user_id, created_at DESC);

-- Exam Attempts
CREATE TABLE IF NOT EXISTS exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score FLOAT,
    total_points INTEGER,
    time_taken_minutes INTEGER,
    answers JSONB,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_attempts(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON exam_attempts(exam_id, completed_at DESC);

-- Summaries
CREATE TABLE IF NOT EXISTS summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    source_note_ids UUID[],
    length_type TEXT,
    style_type TEXT,
    word_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summaries_user ON summaries(user_id, created_at DESC);

-- Content Feedback
CREATE TABLE IF NOT EXISTS content_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    issues JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_feedback_user ON content_feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_feedback_content ON content_feedback(content_type, content_id);

-- Row Level Security Policies

-- Conversation Sessions
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON conversation_sessions;
CREATE POLICY "Users can view own sessions"
    ON conversation_sessions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own sessions" ON conversation_sessions;
CREATE POLICY "Users can create own sessions"
    ON conversation_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON conversation_sessions;
CREATE POLICY "Users can update own sessions"
    ON conversation_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Conversation Messages
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages from own sessions" ON conversation_messages;
CREATE POLICY "Users can view messages from own sessions"
    ON conversation_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_sessions
            WHERE conversation_sessions.id = conversation_messages.session_id
            AND conversation_sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create messages in own sessions" ON conversation_messages;
CREATE POLICY "Users can create messages in own sessions"
    ON conversation_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversation_sessions
            WHERE conversation_sessions.id = conversation_messages.session_id
            AND conversation_sessions.user_id = auth.uid()
        )
    );

-- Flashcards
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own flashcards" ON flashcards;
CREATE POLICY "Users can view own flashcards"
    ON flashcards FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own flashcards" ON flashcards;
CREATE POLICY "Users can create own flashcards"
    ON flashcards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own flashcards" ON flashcards;
CREATE POLICY "Users can update own flashcards"
    ON flashcards FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own flashcards" ON flashcards;
CREATE POLICY "Users can delete own flashcards"
    ON flashcards FOR DELETE
    USING (auth.uid() = user_id);

-- Quizzes
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quizzes" ON quizzes;
CREATE POLICY "Users can view own quizzes"
    ON quizzes FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own quizzes" ON quizzes;
CREATE POLICY "Users can create own quizzes"
    ON quizzes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own quizzes" ON quizzes;
CREATE POLICY "Users can update own quizzes"
    ON quizzes FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own quizzes" ON quizzes;
CREATE POLICY "Users can delete own quizzes"
    ON quizzes FOR DELETE
    USING (auth.uid() = user_id);

-- Quiz Questions
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view questions from own quizzes" ON quiz_questions;
CREATE POLICY "Users can view questions from own quizzes"
    ON quiz_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM quizzes
            WHERE quizzes.id = quiz_questions.quiz_id
            AND quizzes.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create questions in own quizzes" ON quiz_questions;
CREATE POLICY "Users can create questions in own quizzes"
    ON quiz_questions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM quizzes
            WHERE quizzes.id = quiz_questions.quiz_id
            AND quizzes.user_id = auth.uid()
        )
    );

-- Quiz Attempts
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users can view own quiz attempts"
    ON quiz_attempts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users can create own quiz attempts"
    ON quiz_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Exams
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own exams" ON exams;
CREATE POLICY "Users can view own exams"
    ON exams FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own exams" ON exams;
CREATE POLICY "Users can create own exams"
    ON exams FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own exams" ON exams;
CREATE POLICY "Users can update own exams"
    ON exams FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own exams" ON exams;
CREATE POLICY "Users can delete own exams"
    ON exams FOR DELETE
    USING (auth.uid() = user_id);

-- Exam Attempts
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own exam attempts" ON exam_attempts;
CREATE POLICY "Users can view own exam attempts"
    ON exam_attempts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own exam attempts" ON exam_attempts;
CREATE POLICY "Users can create own exam attempts"
    ON exam_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Summaries
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own summaries" ON summaries;
CREATE POLICY "Users can view own summaries"
    ON summaries FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own summaries" ON summaries;
CREATE POLICY "Users can create own summaries"
    ON summaries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own summaries" ON summaries;
CREATE POLICY "Users can update own summaries"
    ON summaries FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own summaries" ON summaries;
CREATE POLICY "Users can delete own summaries"
    ON summaries FOR DELETE
    USING (auth.uid() = user_id);

-- Content Feedback
ALTER TABLE content_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feedback" ON content_feedback;
CREATE POLICY "Users can view own feedback"
    ON content_feedback FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own feedback" ON content_feedback;
CREATE POLICY "Users can create own feedback"
    ON content_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);
