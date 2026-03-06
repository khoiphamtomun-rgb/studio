
import { Quiz } from "./types";

/**
 * Hàm bóc tách văn bản theo quy tắc cố định.
 * Định dạng hỗ trợ: Câu hỏi chính (Câu hỏi phụ: a. Lựa chọn 1 / b. Lựa chọn 2 / c. Lựa chọn 3)
 */
export function parseFixedFormat(text: string, customTitle?: string): Omit<Quiz, 'id' | 'createdAt'> {
  // Regex tìm kiếm các đoạn có dạng: Nội dung (Phần phụ: a. ... / b. ... / c. ...)
  const itemRegex = /([^()]+?)\s*\(([^)]+)\)/g;
  const questions: any[] = [];
  
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    const mainQuestionPart = match[1].trim();
    const insideParens = match[2].trim();
    
    // Tìm vị trí bắt đầu của các lựa chọn (ví dụ: a. , 1. , a) , 1) )
    const optionsStartMatch = insideParens.match(/[a-z0-9][.)]\s/i);
    const optionsStartIndex = optionsStartMatch ? optionsStartMatch.index : -1;
    
    let subQuestion = "";
    let optionsPart = insideParens;
    
    if (optionsStartIndex !== undefined && optionsStartIndex !== -1) {
      // Phần văn bản trước "a." chính là câu hỏi phụ nằm trong ngoặc
      subQuestion = insideParens.substring(0, optionsStartIndex).trim();
      optionsPart = insideParens.substring(optionsStartIndex);
    }
    
    // Hợp nhất câu hỏi chính và câu hỏi phụ (nếu có)
    const fullQuestion = subQuestion ? `${mainQuestionPart} ${subQuestion}` : mainQuestionPart;
    
    // Tách các lựa chọn bằng dấu gạch chéo / hoặc dấu sổ đứng |
    const optionsRaw = optionsPart.split(/[\\/|]/);
    const options: string[] = [];
    let correctAnswer = "";
    let isAnswerGuessed = true;

    optionsRaw.forEach((opt) => {
      let cleanOpt = opt.trim();
      
      // Kiểm tra nếu đáp án được đánh dấu bằng dấu *
      const isMarked = cleanOpt.startsWith('*');
      if (isMarked) {
        cleanOpt = cleanOpt.substring(1).trim();
        isAnswerGuessed = false;
      }
      
      // Loại bỏ tiền tố như a., b., 1., 2. ở đầu mỗi option
      cleanOpt = cleanOpt.replace(/^[a-z0-9][.)]\s*/i, '').trim();
      
      if (cleanOpt) {
        options.push(cleanOpt);
        if (isMarked) {
          correctAnswer = cleanOpt;
        }
      }
    });

    if (options.length > 0) {
      questions.push({
        type: 'multiple-choice',
        question: fullQuestion,
        options,
        correctAnswer: correctAnswer || options[0],
        isAnswerGuessed,
        explanation: isAnswerGuessed 
          ? "Hệ thống không tìm thấy đáp án được đánh dấu (*). Vui lòng tự đối chiếu."
          : "Câu hỏi này được hệ thống tự động bóc tách từ văn bản."
      });
    }
  }

  return {
    quizTitle: customTitle || "Bài tập trích xuất thủ công",
    questions
  };
}
