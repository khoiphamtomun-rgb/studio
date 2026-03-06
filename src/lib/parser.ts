
import { Quiz, QuizQuestion } from "./types";

/**
 * Bộ bóc tách văn bản hiệu suất cao với khả năng trích xuất Cloze Tests và Multiple Choice.
 * Tự động tìm kiếm bảng đáp án (Answer Key) trong toàn bộ văn bản.
 */
export function parseFixedFormat(text: string, customTitle?: string): Omit<Quiz, 'id' | 'createdAt'> {
  const questions: QuizQuestion[] = [];
  
  // 1. Tìm bảng đáp án (Answer Key) trong toàn bộ văn bản
  // Hỗ trợ các định dạng: 1-a, 1.A, 1: word, (1) answer...
  const answerKeyMap: Record<number, string> = {};
  const answerKeyRegex = /(?:^|[\s,;])(\d+)\s*[-.)\s:]\s*([a-zA-Z0-9]{1,20})(?![a-zA-Z0-9])/g;
  let match;
  while ((match = answerKeyRegex.exec(text)) !== null) {
    const num = parseInt(match[1]);
    const val = match[2].toLowerCase();
    // Ưu tiên các đáp án tìm thấy sau cùng hoặc ghi đè nếu cần
    answerKeyMap[num] = val;
  }

  // 2. Chia khối văn bản theo đoạn
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 0);
  let questionCounter = 0;

  for (let block of blocks) {
    block = block.trim();

    // KIỂM TRA ĐỊNH DẠNG CLOZE TEST (Điền từ vào đoạn văn)
    // Tìm các mẫu: (1) ......... hoặc (1) [blank] hoặc (1) AS
    const clozePattern = /\((\d+)\)\s*([._]{3,}|\[.*?\]|[A-Z]{2,})/g;
    const clozeMatches = Array.from(block.matchAll(clozePattern));

    if (clozeMatches.length >= 2) {
      const blanks: { index: number; correctAnswer: string }[] = [];
      let processedPassage = block;

      clozeMatches.forEach((m) => {
        const index = parseInt(m[1]);
        const alreadyFilled = m[2].match(/^[A-Z]{2,}$/) ? m[2] : null;
        
        // Nếu là ví dụ đã điền (như câu 0) thì giữ nguyên nội dung, không tạo blank
        if (alreadyFilled && index === 0) return;

        const keyAnswer = answerKeyMap[index] || "";
        blanks.push({
          index,
          correctAnswer: keyAnswer
        });

        // Thay thế pattern bằng placeholder đặc biệt để render input trên UI
        processedPassage = processedPassage.replace(m[0], `[[BLANK_${index}]]`);
      });

      if (blanks.length > 0) {
        questions.push({
          type: 'cloze',
          question: processedPassage,
          blanks: blanks.sort((a, b) => a.index - b.index),
          explanation: "Bài tập điền từ vào đoạn văn dựa trên ngữ cảnh.",
          isAnswerGuessed: blanks.some(b => !b.correctAnswer)
        });
        continue;
      }
    }

    // KIỂM TRA ĐỊNH DẠNG MULTIPLE CHOICE (Trắc nghiệm)
    // Trường hợp 1: Câu hỏi và đáp án nằm trong ngoặc (Ví dụ: Man/Woman...)
    const inlineMatch = block.match(/^([\s\S]+?)\s*\(([\s\S]*?([a-dA-D][.)]\s[\s\S]+))\)$/);
    if (inlineMatch) {
      const mainPart = inlineMatch[1].trim();
      const contentInside = inlineMatch[2].trim();
      
      const optionStartMatch = contentInside.match(/\b[a-dA-D][.)]\s/);
      let subQuestion = "";
      let optionsPart = contentInside;

      if (optionStartMatch && optionStartMatch.index !== undefined) {
        subQuestion = contentInside.substring(0, optionStartMatch.index).trim();
        optionsPart = contentInside.substring(optionStartMatch.index);
      }
      
      const fullQuestion = subQuestion ? `${mainPart} ${subQuestion}` : mainPart;
      const optionsRaw = optionsPart.split(/[\/\n|]/);
      const options: string[] = [];
      let correctAnswer = "";

      optionsRaw.forEach((opt) => {
        let cleanOpt = opt.trim();
        if (!cleanOpt) return;
        const isMarked = cleanOpt.startsWith('*');
        if (isMarked) cleanOpt = cleanOpt.substring(1).trim();
        
        cleanOpt = cleanOpt.replace(/^[a-zA-Z0-9][.)]\s*/, '').trim().replace(/\)$/, '');
        if (cleanOpt) {
          options.push(cleanOpt);
          if (isMarked) correctAnswer = cleanOpt;
        }
      });

      if (options.length >= 2) {
        questionCounter++;
        // Nếu chưa có correctAnswer từ dấu *, thử lấy từ answerKeyMap
        if (!correctAnswer) {
          const keyLetter = answerKeyMap[questionCounter];
          if (keyLetter) {
            const keyIndex = keyLetter.charCodeAt(0) - 97;
            if (options[keyIndex]) correctAnswer = options[keyIndex];
          }
        }

        questions.push({
          type: 'multiple-choice',
          question: fullQuestion.replace(/^\d+[.)]\s*/, ''),
          options,
          correctAnswer: correctAnswer || options[0],
          explanation: "Câu hỏi trắc nghiệm bóc tách tự động.",
          isAnswerGuessed: !correctAnswer
        });
        continue;
      }
    }

    // Trường hợp 2: Câu hỏi block truyền thống (Câu hỏi dòng 1, đáp án các dòng sau)
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length >= 2) {
      const optionStartIndex = lines.findIndex(l => /^[a-dA-D][.)]\s/.test(l));
      if (optionStartIndex !== -1) {
        const rawQuestionText = lines.slice(0, optionStartIndex).join(' ');
        const optionsRaw = lines.slice(optionStartIndex);
        const options: string[] = [];
        let correctAnswer = "";

        optionsRaw.forEach(line => {
          let cleanLine = line.trim();
          const isMarked = cleanLine.includes('*');
          if (isMarked) cleanLine = cleanLine.replace('*', '').trim();
          
          const optText = cleanLine.replace(/^[a-zA-Z0-9][.)]\s*/, '').trim();
          if (optText) {
            options.push(optText);
            if (isMarked) correctAnswer = optText;
          }
        });

        if (options.length >= 2) {
          questionCounter++;
          if (!correctAnswer) {
            const keyLetter = answerKeyMap[questionCounter];
            if (keyLetter) {
              const keyIndex = keyLetter.charCodeAt(0) - 97;
              if (options[keyIndex]) correctAnswer = options[keyIndex];
            }
          }

          questions.push({
            type: 'multiple-choice',
            question: rawQuestionText.replace(/^\d+[.)]\s*/, ''),
            options,
            correctAnswer: correctAnswer || options[0],
            explanation: "Câu hỏi trắc nghiệm bóc tách tự động.",
            isAnswerGuessed: !correctAnswer
          });
        }
      }
    }
  }

  return {
    quizTitle: customTitle || "Bài tập SmartAssess",
    questions
  };
}
