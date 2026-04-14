import { Attempt, Quiz } from "../models/DatabaseInterfaces";
import { GEMINI_API_KEY, GEMINI_MODEL } from "./config";

function buildFallbackFeedback(attempt: Attempt): string {
  const pct = attempt.totalQuestions
    ? Math.round((attempt.score / attempt.totalQuestions) * 100)
    : 0;

  if (pct >= 80) {
    return "Excellent work. You are consistently strong on this topic. Try a harder quiz to keep improving.";
  }
  if (pct >= 60) {
    return "Good effort. You have a solid base, but a few weak spots remain. Review incorrect questions and retry soon.";
  }
  return "You are still building fundamentals in this topic. Revisit core concepts and practice with easier quizzes first.";
}

export async function generateAttemptFeedback(
  quiz: Quiz,
  attempt: Attempt
): Promise<string> {
  const fallback = buildFallbackFeedback(attempt);

  if (!GEMINI_API_KEY) return fallback;

  const wrongQuestionSummaries = quiz.questions
    .map((question, index) => {
      const selected = attempt.responses[index];
      const isCorrect = selected === question.correctOptionIndex;
      if (isCorrect) return null;

      const selectedText =
        selected === undefined ? "No answer" : question.options[selected];
      const correctText = question.options[question.correctOptionIndex];
      return {
        question: question.text,
        selected: selectedText,
        correct: correctText,
        difficulty: question.difficulty,
      };
    })
    .filter(Boolean)
    .slice(0, 5);

  const prompt = `
You are an AI tutor for a quiz platform.
Generate concise personalized feedback for a student.

Rules:
- Keep response under 120 words.
- Use plain text only.
- Include: 1 strength, 1 weakness, and 1 next-step suggestion.
- Tone: supportive and actionable.

Quiz title: ${quiz.title}
Subject: ${quiz.subject}
Score: ${attempt.score}/${attempt.totalQuestions}

Wrong questions summary:
${JSON.stringify(wrongQuestionSummaries, null, 2)}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 220,
          },
        }),
      }
    );

    if (!response.ok) return fallback;

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}
