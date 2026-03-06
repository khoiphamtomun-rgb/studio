
import { Quiz } from "./types";

/**
 * Hàm bóc tách văn bản theo nhiều quy tắc phổ biến.
 */
export function parseFixedFormat(text: string, customTitle?: string): Omit<Quiz, 'id' | 'createdAt'> {
  const questions: any[] = [];
  
  // 1. Định dạng Đối thoại + Câu hỏi + Đáp án xuống dòng (Dialogue Block)
  // Ví dụ:
  // Woman: ...
  // Man: ...
  // What does the man mean?
  // a. Option A
  // b. Option B
  const dialogueBlockRegex = /((?:.*?\n)*?)(.+?\?)\n\s*(?:a[.)]\s+)(.+?)(?=\n\s*\d+[.)]|\n\s*\n|$)/gs;
  let dMatch;
  while ((dMatch = dialogueBlockRegex.exec(text)) !== null) {
    const context = dMatch[1].trim();
    const questionText = dMatch[2].trim();
    const optionsRaw = 'a. ' + dMatch[3].trim();
    
    const fullQuestion = context ? `${context}\n${questionText}` : questionText;
    
    // Bóc tách options từ chuỗi a. b. c.
    const options: string[] = [];
    const optLines = optionsRaw.split(/\n\s*/);
    optLines.forEach(line => {
      const cleanOpt = line.replace(/^[a-z0-9][.)]\s*/i, '').trim();
      if (cleanOpt) options.push(cleanOpt);
    });

    if (options.length >= 2) {
      questions.push({
        type: 'multiple-choice',
        question: fullQuestion,
        options,
        correctAnswer: options[0],
        isAnswerGuessed: true,
        explanation: "Được bóc tách từ định dạng đối thoại (Dialogue Block)."
      });
    }
  }

  if (questions.length === 0) {
    // 2. Định dạng khối (Block Format) có số thứ tự: 
    // 1. Câu hỏi?
    // A. Lựa chọn 1
    // B. Lựa chọn 2
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
          correctAnswer: options[0],
          isAnswerGuessed: true,
          explanation: "Được bóc tách từ định dạng danh sách (Block List)."
        });
      }
    }
  }

  if (questions.length === 0) {
    // 3. Định dạng trong ngoặc (Inline Parentheses) - Đã cải tiến:
    // Ví dụ: Man: "..." Woman: "..." (The woman is: a. ... / b. ... / c. ...)
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

  // 4. Định dạng một dòng đơn giản (Simple One-liner):
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
