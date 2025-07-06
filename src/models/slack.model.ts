import mongoose from "mongoose";

const slackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teamId: { type: String, required: true },
  slackId: { type: String, required: true },
  slackToken: { type: String, required: true },
  slackTeamName: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const SlackIntegration = mongoose.model('SlackIntegration', slackSchema);
