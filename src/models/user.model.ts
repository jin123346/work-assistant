import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userId: {type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name : { type: String}, // 이메일 기반 로그인
  createdAt: {type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
