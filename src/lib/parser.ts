
import { Quiz } from "./types";

/**
 * Hàm bóc tách văn bản theo nhiều quy tắc phổ biến.
 */
export function parseFixedFormat(text: string, customTitle?: string): Omit<Quiz, 'id' | 'createdAt'> {
  const questions: any[] = [];
  
  // 1. Thử bóc tách định dạng khối (Block Format): 
  // 1. Câu hỏi?
  // A. Lựa chọn 1
  // B. Lựa chọn 2
  // Đáp án: A
  const blockRegex = /(?:^|\n)\s*(\d+)[.)]\s*(.+?)\n\s*([A-D][.)]\s*.+?)(?=\n\s*\d+[.)]|\n\s*Đáp án:|\n\s*Answer:|$)/gs;
  let blockMatch;
  while ((blockMatch = blockRegex.exec(text)) !== null) {
    const questionText = blockMatch[2].trim();
    const optionsRaw = blockMatch[3].trim();
    
    const optionLines = optionsRaw.split(/\n/);
    const options: string[] = [];
    optionLines.forEach(line => {
      const cleanOpt = line.replace(/^[A-D][.)]\s*/i, '').trim();
      if (cleanOpt) options.push(cleanOpt);
    });

    if (options.length > 0) {
      questions.push({
        type: 'multiple-choice',
        question: questionText,
        options,
        correctAnswer: options[0], // Mặc định là câu đầu nếu không có mark
        isAnswerGuessed: true,
        explanation: "Được bóc tách từ định dạng danh sách (Block List)."
      });
    }
  }

  // 2. Thử bóc tách định dạng trong ngoặc (Inline Parentheses) - Cải tiến:
  // Ví dụ: Man: "..." Woman: "..." (The woman is: a. ... / b. ... / c. ...)
  if (questions.length === 0) {
    const inlineRegex = /([^()\n]+?)\s*\(([^)]+)\)/g;
    let inlineMatch;
    while ((inlineMatch = inlineRegex.exec(text)) !== null) {
      const mainPart = inlineMatch[1].trim();
      const insideParens = inlineMatch[2].trim();
      
      // Tìm vị trí của a. hoặc A. hoặc 1.
      const firstOptionMatch = insideParens.match(/[a-d1-4][.)]\s/i);
      
      let subQuestion = "";
      let optionsPart = insideParens;
      
      if (firstOptionMatch && firstOptionMatch.index !== undefined) {
        subQuestion = insideParens.substring(0, firstOptionMatch.index).trim();
        optionsPart = insideParens.substring(firstOptionMatch.index);
      }
      
      const fullQuestion = subQuestion ? `${mainPart} ${subQuestion}` : mainPart;
      const optionsRaw = optionsPart.split(/[\\/|]/);
      const options: string[] = [];
      let correctAnswer = "";
      let isAnswerGuessed = true;

      optionsRaw.forEach((opt) => {
        let cleanOpt = opt.trim();
        const isMarked = cleanOpt.startsWith('*');
        if (isMarked) {
          cleanOpt = cleanOpt.substring(1).trim();
          isAnswerGuessed = false;
        }
        cleanOpt = cleanOpt.replace(/^[a-z0-9][.)]\s*/i, '').trim();
        if (cleanOpt) {
          options.push(cleanOpt);
          if (isMarked) correctAnswer = cleanOpt;
        }
      });

      if (options.length > 0) {
        questions.push({
          type: 'multiple-choice',
          question: fullQuestion,
          options,
          correctAnswer: correctAnswer || options[0],
          isAnswerGuessed,
          explanation: "Được bóc tách từ định dạng trong ngoặc (Inline)."
        });
      }
    }
  }

  // 3. Định dạng một dòng đơn giản (Simple One-liner):
  // Question? [A] Opt1 [B] Opt2 [C] Opt3
  if (questions.length === 0) {
    const simpleRegex = /(.+?)\s*\[A\]\s*(.+?)\s*\[B\]\s*(.+?)(?:\s*\[C\]\s*(.+?))?(?:\s*\[D\]\s*(.+?))?$/gm;
    let simpleMatch;
    while ((simpleMatch = simpleRegex.exec(text)) !== null) {
      const q = simpleMatch[1].trim();
      const opts = [simpleMatch[2], simpleMatch[3], simpleMatch[4], simpleMatch[5]].filter(Boolean);
      if (opts.length >= 2) {
        questions.push({
          type: 'multiple-choice',
          question: q,
          options: opts.map(o => o.trim()),
          correctAnswer: opts[0].trim(),
          isAnswerGuessed: true,
          explanation: "Được bóc tách từ định dạng thẻ ngoặc vuông [A][B]."
        });
      }
    }
  }

  return {
    quizTitle: customTitle || "Bài tập bóc tách đa định dạng",
    questions
  };
}
