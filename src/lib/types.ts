
import { GenerateQuizFromDocumentOutput } from "@/ai/flows/generate-quiz-from-document";

export type Quiz = GenerateQuizFromDocumentOutput & {
  id: string;
  createdAt: string;
  documentSource?: string;
};

export type UserAnswer = {
  questionIndex: number;
  answer: string | boolean;
  isCorrect: boolean;
  explanation?: string;
};

export type QuizResult = {
  quizId: string;
  score: number;
  totalQuestions: number;
  answers: UserAnswer[];
  completedAt: string;
};
