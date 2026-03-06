
import { GenerateQuizFromDocumentOutput } from "@/ai/flows/generate-quiz-from-document";

export type QuizQuestion = (
  | {
      type: 'multiple-choice';
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
    }
  | {
      type: 'true-false';
      question: string;
      correctAnswer: boolean;
      explanation: string;
    }
  | {
      type: 'short-answer';
      question: string;
      correctAnswer: string;
      explanation: string;
    }
  | {
      type: 'cloze';
      question: string; // Đây là đoạn văn chứa placeholder kiểu [[1]], [[2]]
      blanks: { index: number; correctAnswer: string }[];
      explanation: string;
    }
) & {
  isAnswerGuessed?: boolean;
};

export type Quiz = {
  quizTitle: string;
  id: string;
  createdAt: string;
  documentSource?: string;
  questions: QuizQuestion[];
};

export type UserAnswer = {
  questionIndex: number;
  answer: any; // Có thể là string cho MC, boolean cho TF, hoặc Record<number, string> cho Cloze
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
