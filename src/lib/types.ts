
import { GenerateQuizFromDocumentOutput } from "@/ai/flows/generate-quiz-from-document";

export type QuizQuestion = (GenerateQuizFromDocumentOutput['questions'][number]) & {
  isAnswerGuessed?: boolean;
};

export type Quiz = Omit<GenerateQuizFromDocumentOutput, 'questions'> & {
  id: string;
  createdAt: string;
  documentSource?: string;
  questions: QuizQuestion[];
};

export type UserAnswer = {
  questionIndex: number;
  answer: string | boolean;
  isCorrect: boolean;
  explanation?: string;
  isAnswerGuessed?: boolean;
};

export type QuizResult = {
  quizId: string;
  score: number;
  totalQuestions: number;
  answers: UserAnswer[];
  completedAt: string;
};
