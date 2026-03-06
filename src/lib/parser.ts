
import { Quiz } from "./types";

/**
 * Bộ bóc tách văn bản hiệu suất cao với khả năng trích xuất bảng đáp án tự động.
 */
export function parseFixedFormat(text: string, customTitle?: string): Omit<Quiz, 'id' | 'createdAt'> {
  const questions: any[] = [];
  
  // 1. Tìm kiếm và trích xuất bảng đáp án (Answer Key) trong toàn bộ văn bản
  // Hỗ trợ các định dạng: 1-a, 2.b, 3) c, 4: d...
  const answerKeyMap: Record<number, string> = {};
  const answerKeyRegex = /(\d+)\s*[-.)\s:]\s*([a-dA-D])(?![a-zA-Z0-9])/g;
  let match;
  while ((match = answerKeyRegex.exec(text)) !== null) {
    const num = parseInt(match[1]);
    const letter = match[2].toLowerCase();
    answerKeyMap[num] = letter;
  }

  // 2. Chia nhỏ văn bản thành các khối dựa trên 2 dấu xuống dòng trở lên
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 0);
  let questionCounter = 0;

  for (let block of blocks) {
    block = block.trim();
    
    // Bỏ qua các khối trông giống như bảng đáp án thuần túy (đã xử lý ở bước 1)
    if (block.length < 50 && block.match(answerKeyRegex)) continue;

    let parsedQuestion: any = null;

    // A. Định dạng: Nội dung chính (Câu hỏi phụ: a. Lựa chọn / b. Lựa chọn)
    const inlineMatch = block.match(/^([\s\S]+?)\s*\(([\s\S]+)\)$/);
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
      let isAnswerGuessed = true;

      optionsRaw.forEach((opt) => {
        let cleanOpt = opt.trim();
        if (!cleanOpt) return;
        const isMarked = cleanOpt.startsWith('*');
        if (isMarked) {
          cleanOpt = cleanOpt.substring(1).trim();
          isAnswerGuessed = false;
        }
        cleanOpt = cleanOpt.replace(/^[a-zA-Z0-9][.)]\s*/, '').trim();
        if (cleanOpt) {
          options.push(cleanOpt);
          if (isMarked) correctAnswer = cleanOpt;
        }
      });

      if (options.length >= 2) {
        questionCounter++;
        parsedQuestion = {
          type: 'multiple-choice',
          question: fullQuestion,
          options,
          correctAnswer,
          isAnswerGuessed,
          index: questionCounter
        };
      }
    }

    // B. Định dạng: Danh sách câu hỏi nhiều dòng (Block Format)
    if (!parsedQuestion) {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length >= 2) {
        const optionStartIndex = lines.findIndex(l => /^[a-dA-D][.)]\s/.test(l));
        if (optionStartIndex !== -1) {
          const rawQuestionText = lines.slice(0, optionStartIndex).join(' ');
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
            const optText = cleanLine.replace(/^[a-zA-Z0-9][.)]\s*/, '').trim();
            if (optText) {
              options.push(optText);
              if (isMarked) correctAnswer = optText;
            }
          });

          if (options.length >= 2) {
            questionCounter++;
            parsedQuestion = {
              type: 'multiple-choice',
              question: rawQuestionText.replace(/^\d+[.)]\s*/, ''),
              options,
              correctAnswer,
              isAnswerGuessed,
              index: questionCounter
            };
          }
        }
      }
    }

    // 3. Nếu bóc tách thành công, đối chiếu với Answer Key đã trích xuất ở Bước 1
    if (parsedQuestion) {
      const keyLetter = answerKeyMap[parsedQuestion.index];
      if (keyLetter && !parsedQuestion.correctAnswer) {
        const keyIndex = keyLetter.charCodeAt(0) - 97; // a -> 0
        if (parsedQuestion.options[keyIndex]) {
          parsedQuestion.correctAnswer = parsedQuestion.options[keyIndex];
          parsedQuestion.isAnswerGuessed = false;
          parsedQuestion.explanation = `Đáp án tự động trích xuất từ bảng đáp án (Câu ${parsedQuestion.index}: ${keyLetter.toUpperCase()}).`;
        }
      }

      // Nếu vẫn không có đáp án, mặc định chọn câu đầu và đánh dấu "Tự đối chiếu"
      if (!parsedQuestion.correctAnswer) {
        parsedQuestion.correctAnswer = parsedQuestion.options[0];
        parsedQuestion.isAnswerGuessed = true;
        parsedQuestion.explanation = "Câu hỏi này chưa có đáp án chính thức, vui lòng tự đối chiếu.";
      }

      questions.push(parsedQuestion);
    }
  }

  return {
    quizTitle: customTitle || "Bài tập bóc tách tự động",
    questions
  };
}
