import mongoose from "mongoose";

const githubSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  githubUsername: { type: String },
  githubToken: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const GitHubIntegration = mongoose.model('GitHubIntegration', githubSchema);
