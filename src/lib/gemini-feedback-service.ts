import { Attempt, Quiz } from "../models/DatabaseInterfaces";
import { GEMINI_API_KEY, GEMINI_MODEL } from "./config";

function buildFallbackFeedback(attempt: Attempt): string {
  const pct = attempt.totalQuestions
    ? Math.round((attempt.score / attempt.totalQuestions) * 100)
    : 0;

  if (pct >= 80) {
    return [
      "Strength: Strong mastery of the core concepts.",
      "Focus area: Keep practicing mixed-difficulty questions to avoid small mistakes.",
      "Next step: Try a harder quiz and explain each correct answer in your own words.",
    ].join("\n");
  }
  if (pct >= 60) {
    return [
      "Strength: You have a good foundation in this topic.",
      "Focus area: A few concepts are still inconsistent under quiz pressure.",
      "Next step: Review wrong questions one-by-one, then retake a similar quiz within 24 hours.",
    ].join("\n");
  }
  return [
    "Strength: You attempted the full quiz and identified learning gaps.",
    "Focus area: Core fundamentals need reinforcement.",
    "Next step: Revisit basics, solve 5-10 easier practice questions, then retry this quiz.",
  ].join("\n");
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
- Keep response under 180 words.
- Use plain text only.
- Use exactly this format (one line each):
  Strength: ...
  Focus area: ...
  Next step: ...
- Focus on specific misconceptions shown in wrong answers.
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
            temperature: 0.35,
            maxOutputTokens: 260,
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
