const API_URL = 'http://localhost:5000/api';

export const translateWordsToSentence = async (words) => {
  try {
    const response = await fetch(`${API_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Translation API Error:", error);
    return { success: false, error: error.message };
  }
};
