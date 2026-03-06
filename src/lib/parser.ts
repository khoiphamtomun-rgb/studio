
import { Quiz } from "./types";

/**
 * Hàm bóc tách văn bản tối ưu hóa cho hiệu suất cao.
 * Chia nhỏ văn bản thành các khối để tránh treo trình duyệt.
 */
export function parseFixedFormat(text: string, customTitle?: string): Omit<Quiz, 'id' | 'createdAt'> {
  const questions: any[] = [];
  
  // Bước 1: Chia nhỏ văn bản thành các khối dựa trên khoảng trắng dòng hoặc số thứ tự câu
  // Điều này giúp tránh việc chạy Regex trên một chuỗi quá dài gây "treo"
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 0);

  for (let block of blocks) {
    block = block.trim();
    
    // Thử bóc tách theo định dạng: Câu hỏi (a. / b. / c.)
    // Mẫu: Question text (a. Opt 1 / b. Opt 2)
    const inlineMatch = block.match(/([^()\n]+?)\s*\(([^)]+)\)/);
    if (inlineMatch) {
      const mainPart = inlineMatch[1].trim();
      const insideParens = inlineMatch[2].trim();
      
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

      if (options.length >= 2) {
        questions.push({
          type: 'multiple-choice',
          question: fullQuestion,
          options,
          correctAnswer: correctAnswer || options[0],
          isAnswerGuessed,
          explanation: "Được bóc tách từ định dạng trong ngoặc."
        });
        continue; // Đã xử lý xong khối này
      }
    }

    // Thử bóc tách định dạng Đối thoại hoặc Danh sách dòng:
    // Mẫu: 1. Question? \n a. Opt \n b. Opt
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length >= 3) {
      const optionStartIndex = lines.findIndex(l => /^[a-d][.)]\s/i.test(l));
      
      if (optionStartIndex !== -1) {
        const questionText = lines.slice(0, optionStartIndex).join('\n');
        const optionsRaw = lines.slice(optionStartIndex);
        const options: string[] = [];
        let correctAnswer = "";
        let isAnswerGuessed = true;

        optionsRaw.forEach(line => {
          let cleanLine = line.trim();
          const isMarked = cleanLine.includes('*');
          if (isMarked) {
            cleanLine = cleanLine.replace('*', '').trim();
            isAnswerGuessed = false;
          }
          const optText = cleanLine.replace(/^[a-z0-9][.)]\s*/i, '').trim();
          if (optText) {
            options.push(optText);
            if (isMarked) correctAnswer = optText;
          }
        });

        if (options.length >= 2) {
          questions.push({
            type: 'multiple-choice',
            question: questionText.replace(/^\d+[.)]\s*/, ''),
            options,
            correctAnswer: correctAnswer || options[0],
            isAnswerGuessed,
            explanation: "Được bóc tách từ định dạng danh sách dòng."
          });
        }
      }
    }
  }

  return {
    quizTitle: customTitle || "Bài tập bóc tách đa định dạng",
    questions
  };
}
