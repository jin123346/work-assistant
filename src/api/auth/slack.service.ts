import axios from "axios";
import dotenv from 'dotenv';
import { User } from "../../models/user.model";
import { attachUser } from "../../middleware/attachUser";
import { subDays, startOfDay, endOfDay } from 'date-fns';


dotenv.config();
const severBaseURL = process.env.SERVER_BASE_URL!;

interface SendSlackDMOptions {
  slackId: string;
  slackToken: string;
  text: string;
  blocks?: any[];
}


export const userChannelId = async ({
  slackId,
  slackToken,
}: {
  slackId: string;
  slackToken: string;
}) =>{
      const dmRes = await axios.post(
      'https://slack.com/api/conversations.open',
      { users: slackId },
      {
        headers: {
          Authorization: `Bearer ${slackToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const channelId = dmRes.data.channel.id;
    return channelId;
}


export const sendSlackDM = async ({
  slackId,
  slackToken,
  text,
}: SendSlackDMOptions): Promise<void> => {
  try {

    const channelId = await userChannelId({slackId : slackId, slackToken : slackToken});

    // 2. 메시지 보내기
    await sendSimpleMessage({channel : channelId, slackToken:slackToken , text : text })
    return;
  } catch (err) {
    console.error('Slack DM 전송 실패:', err);
    throw err;

  }
};

export const sendGithubConnectMessage = async ({
  slackId,
  slackToken,
  status,
}: {
  slackId: string;
  slackToken: string;
  status : boolean;
}) => {

  try {


    const channelId = await userChannelId({slackId : slackId, slackToken : slackToken});

     const blocks = status
      ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '👋 GitHub 이미 연동되어있습니다.',
            },
          },
        ]
      : [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '👋 GitHub 로그인이 필요합니다.',
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '🔗 GitHub 연동하기',
                },
                url: `${severBaseURL}/api/auth/github/login?slackId=${slackId}`,
                action_id: 'github_connect',
              },
            ],
          },
        ];


    await axios.post(
      'https://slack.com/api/chat.postMessage',
      {
        channel: channelId,
        blocks: blocks,
      },
      {
        headers: {
          Authorization: `Bearer ${slackToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Slack 메시지 전송 실패:', error);
  }
};


export const checkGithubStatus = async (githubUsername : string)=> {
    console.log('깃허브 연결 유무 확인 : ',githubUsername);
    if(!githubUsername){
        return  false;
    }else{
        return githubUsername != null;

    }
}


export const sendSimpleMessage = async ({
      channel,
      slackToken,
      text,
    }: {
      channel:string;
      slackToken: string;
      text: string;
    }) => {
      try {
        await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel : channel,
            text,
          },
          {
            headers: {
              Authorization: `Bearer ${slackToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (err) {
        console.error('메시지 전송 실패:', err);
      }
};

export const getGithubActivitySummary = async (githubUsername: string, githubToken: string)=>{
    const yesterday = subDays(new Date(),1);
    const since = startOfDay(yesterday).toISOString();
    const until = endOfDay(yesterday).toISOString();

    const eventUrl = `https://api.github.com/users/${githubUsername}/events`;

    const response = await axios.get(eventUrl,{
      headers:{
        Authorization : `Bearer ${githubToken}`,
        Accept : 'application/vnd.github.v3+json',

      }
    });

    const filteredEvents = response.data.filter((event: any) =>{
      const createdAt = new Date(event.created_at);
      return createdAt >= new Date(since) && createdAt <= new Date(until);
    });

    const summary = filteredEvents.map((event: any) => {
    return `📌 ${event.type} - ${event.repo.name}`;
  }).join('\n');

  return summary || '어제 활동 내역이 없습니다.'
};


