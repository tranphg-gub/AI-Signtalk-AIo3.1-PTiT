const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log('✅ Gemini AI đã được khởi tạo.');
} else {
  console.warn('⚠️  GEMINI_API_KEY chưa cấu hình → fallback về nối từ đơn giản.');
}

const translateSignLanguage = async (req, res) => {
  try {
    const { words } = req.body;
    if (!words || words.length === 0) {
      return res.json({ success: false, message: 'Không có từ khóa nào.' });
    }

    // Lọc bỏ TRẠNG THÁI NGHỈ
    const filtered = words.filter(w => w !== 'TRẠNG THÁI NGHỈ' && w !== 'Không rõ');

    if (!genAI || filtered.length === 0) {
      return res.json({ success: true, sentence: filtered.join(' ') });
    }

    const prompt = `Bạn là trợ lý phiên dịch ngôn ngữ ký hiệu tiếng Việt.
Nhận các từ khóa rời rạc từ AI nhận diện cử chỉ và ghép thành câu tiếng Việt hoàn chỉnh, tự nhiên, lịch sự.
Chỉ trả về ĐÚNG 1 câu kết quả, KHÔNG giải thích thêm.
Từ khóa: ${filtered.join(', ')}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const sentence = result.response.text().trim();

    res.json({ success: true, sentence });
  } catch (error) {
    console.error('❌ Gemini Error:', error.message);
    res.status(500).json({ success: false, error: 'Lỗi AI dịch thuật.' });
  }
};

module.exports = { translateSignLanguage };
