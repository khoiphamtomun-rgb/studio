
import { Quiz, QuizResult } from "./types";

const QUIZZES_KEY = 'smartassess_quizzes';
const RESULTS_KEY = 'smartassess_results';

export const storage = {
  saveQuiz: (quiz: Quiz) => {
    if (typeof window === 'undefined') return;
    const quizzes = storage.getQuizzes();
    localStorage.setItem(QUIZZES_KEY, JSON.stringify([quiz, ...quizzes]));
  },
  getQuizzes: (): Quiz[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(QUIZZES_KEY);
    return data ? JSON.parse(data) : [];
  },
  getQuizById: (id: string): Quiz | undefined => {
    return storage.getQuizzes().find(q => q.id === id);
  },
  saveResult: (result: QuizResult) => {
    if (typeof window === 'undefined') return;
    const results = storage.getResults();
    localStorage.setItem(RESULTS_KEY, JSON.stringify([result, ...results]));
  },
  getResults: (): QuizResult[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(RESULTS_KEY);
    return data ? JSON.parse(data) : [];
  },
  getResultsForQuiz: (quizId: string): QuizResult[] => {
    return storage.getResults().filter(r => r.quizId === quizId);
  }
};
