const axios = require('axios');
const PYTHON_API = process.env.PYTHON_API || 'http://localhost:8000';
const TIMEOUT = 8000;

const callPythonPredictor = async (frames) => {
  try {
    const res = await axios.post(`${PYTHON_API}/predict`, { frames }, { timeout: TIMEOUT });
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    console.error('❌ [AI Core] Predict:', msg);
    return { error: msg };
  }
};

const saveFramesToNpy = async (gestureName, frames, index) => {
  try {
    const res = await axios.post(`${PYTHON_API}/collect`,
      { gesture_name: gestureName, sequence_index: index, frames },
      { timeout: TIMEOUT }
    );
    return { success: true, gesture_name: res.data.gesture_name || gestureName, total_samples: res.data.total_samples };
  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    console.error('❌ [AI Core] Save:', msg);
    return { success: false, error: msg };
  }
};

const getDatasetStats = async () => {
  try {
    const res = await axios.get(`${PYTHON_API}/stats`, { timeout: TIMEOUT });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || err.message);
  }
};

const trainLSTMModel = async () => {
  try {
    const res = await axios.post(`${PYTHON_API}/train`, {}, { timeout: 15000 });
    return { success: true, message: res.data.message };
  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    console.error('❌ [AI Core] Train:', msg);
    return { success: false, message: msg };
  }
};

const deleteGestureData = async (gestureName) => {
  try {
    const res = await axios.post(`${PYTHON_API}/delete_all`,
      { gesture_name: gestureName },
      { timeout: TIMEOUT }
    );
    return { success: true, message: res.data.message };
  } catch (err) {
    return { success: false, message: err.response?.data?.detail || err.message };
  }
};

const checkAICoreHealth = async () => {
  try {
    const res = await axios.get(`${PYTHON_API}/health`, { timeout: 3000 });
    return { online: true, ...res.data };
  } catch {
    return { online: false };
  }
};

module.exports = {
  callPythonPredictor,
  saveFramesToNpy,
  getDatasetStats,
  trainLSTMModel,
  deleteGestureData,
  checkAICoreHealth
};
