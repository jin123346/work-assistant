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

//어제한일 
export const getGithubActivitySummary = async (githubUsername: string, githubToken: string)=>{
  const today = new Date();

  const kstToday = new Date(today.getTime() + (9 * 60 * 60 * 1000)); // UTC → KST 보정
  const kstYear = kstToday.getUTCFullYear();
  const kstMonth = kstToday.getUTCMonth();
  const kstDate = kstToday.getUTCDate() - 1;
  const utcStartOfYesterday = new Date(Date.UTC(kstYear, kstMonth, kstDate, 0 - 9, 0, 0));
  const utcEndOfYesterday = new Date(Date.UTC(kstYear, kstMonth, kstDate, 23 - 9, 59, 59, 999));

  console.log("어제 날짜 범위 (UTC):", utcStartOfYesterday.toISOString(), "~", utcEndOfYesterday.toISOString());

  console.log('token : ',githubToken);

    
    const eventUrl = `https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&per_page=100&page=1`;
    console.log(eventUrl)
    const repoList = [];

    try{
      const response = await axios.get(eventUrl,{
      headers:{
        Authorization : `Bearer ${githubToken}`,
        Accept : 'application/vnd.github+json',
      }
    });
    const eventList: any[] = [] ; 

    for( const repo of response.data){
      repoList.push(repo.name);
      const respoURL = `https://api.github.com/repos/${repo.full_name}/events`;

      try{
        const res = await axios.get(respoURL, {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: 'application/vnd.github+json',
            },
          });
        eventList.push(...res.data);
        console.log('response Data : ',res.data);


      }catch(err){
        console.error(`!${repo.name} 이벤트 조회 실패`, err);
      }
    }

    const filteredEvents = eventList.filter((event: any) => {
      const time = new Date(event.created_at);
      return time >= utcStartOfYesterday && time <= utcEndOfYesterday;
    });

    console.log('filtered Event : ',filteredEvents);

    const summary = filteredEvents.map((event: any) => {
        if (event.type === 'PushEvent' && event.payload?.commits?.length) {
          const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
          const branch = event.payload.ref?.replace('refs/heads/', '');
          return `📌 Push - ${event.repo.name} (${branch})
      - ${event.payload.commits.map((c: any) =>` • ${c.message}`).join('\n- ')}
      🔗 https://github.com/${event.repo.name}/commit/${event.payload.commits[0].sha}
      🕒 ${date}`;
        } else if (event.type === 'CreateEvent') {
          const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

          const refType = event.payload.ref_type;
          const ref = event.payload.ref || '';
          return `📎 Create - ${refType} ${ref} @ ${event.repo.name}
      🕒 ${date}`;
        } else if (event.type === 'PullRequestEvent') {
            const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
            const action = event.payload.action;
            const pr = event.payload.pull_request;
            const prTitle = pr?.title || 'No title';
            const prUrl = pr?.html_url || '';

            return `📌 PullRequest ${action.toUpperCase()} - ${event.repo.name}
          • ${prTitle}
          🔗 ${prUrl}
          🕒 ${date}`;
          }else if (event.type === 'IssueCommentEvent') {
              const comment = event.payload.comment;
              const issue = event.payload.issue;
              const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

              return `💬 Issue Comment - ${event.repo.name}
              • ${comment?.body?.slice(0, 100) || 'No content'}...
              🔗 ${comment?.html_url || ''}
              🕒 ${date}`;
            } else if (event.type === 'PullRequestReviewCommentEvent') {
              const comment = event.payload.comment;
              const pr = event.payload.pull_request;
              const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

              return `📝 PR Review Comment - ${event.repo.name}
              • ${comment?.body?.slice(0, 100) || 'No content'}...
              🔗 ${comment?.html_url || ''}
              🕒 ${date}`;
            } else if (event.type === 'CommitCommentEvent') {
              const comment = event.payload.comment;
              const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

              return `🧾 Commit Comment - ${event.repo.name}
              • ${comment?.body?.slice(0, 100) || 'No content'}...
              🔗 ${comment?.html_url || ''}
              🕒 ${date}`;
            }else {
            const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
            return `📌 ${event.type} - ${event.repo.name}\n  🕒 ${date}`;
          }
      }).filter(Boolean).join('\n\n');

      return summary || '어제 활동 내역이 없습니다.'


    }catch(err){
      console.error('GitHub API 호출 실패:', err);
      return 'GitHub API 호출에 실패했습니다.';
    }

};


//오늘 한일 
export const getTodayGithubActivitySummary = async (githubUsername: string, githubToken: string)=>{
    const today = new Date();

    const kstToday = new Date(today.getTime() + (9 * 60 * 60 * 1000)); // UTC → KST 보정
    const kstYear = kstToday.getUTCFullYear();
    const kstMonth = kstToday.getUTCMonth();
    const kstDate = kstToday.getUTCDate();
    const utcStartOfToday = new Date(Date.UTC(kstYear, kstMonth, kstDate, 0 - 9, 0, 0));
    const utcEndOfToday = new Date(Date.UTC(kstYear, kstMonth, kstDate, 23 - 9, 59, 59, 999));

    console.log("오늘 날짜 범위 (UTC):", utcStartOfToday.toISOString(), "~", utcEndOfToday.toISOString());

     const eventUrl = `https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&per_page=100&page=1`;
    console.log(eventUrl)
    const repoList = [];

    try{
      const response = await axios.get(eventUrl,{
      headers:{
        Authorization : `Bearer ${githubToken}`,
        Accept : 'application/vnd.github+json',
      }
    });
    const eventList: any[] = [] ; 

    for( const repo of response.data){
      repoList.push(repo.name);
      const respoURL = `https://api.github.com/repos/${repo.full_name}/events`;

      try{
        const res = await axios.get(respoURL, {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: 'application/vnd.github+json',
            },
          });
        eventList.push(...res.data);
        console.log('filtered Event : ',res.data);


      }catch(err){
        console.error(`!${repo.name} 이벤트 조회 실패`, err);
      }
    }

    const filteredEvents = eventList.filter((event: any) => {
      const time = new Date(event.created_at);
      return time >= utcStartOfToday && time <= utcEndOfToday;
    });

    console.log('filtered Event : ',filteredEvents);

    const summary = filteredEvents.map((event: any) => {
        if (event.type === 'PushEvent' && event.payload?.commits?.length) {
          const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
          const branch = event.payload.ref?.replace('refs/heads/', '');
          return `📌 Push - ${event.repo.name} (${branch})
      - ${event.payload.commits.map((c: any) =>` • ${c.message}`).join('\n- ')}
      🔗 https://github.com/${event.repo.name}/commit/${event.payload.commits[0].sha}
      🕒 ${date}`;
        } else if (event.type === 'CreateEvent') {
          const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

          const refType = event.payload.ref_type;
          const ref = event.payload.ref || '';
          return `📎 Create - ${refType} ${ref} @ ${event.repo.name}
      🕒 ${date}`;
        } else if (event.type === 'PullRequestEvent') {
            const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
            const action = event.payload.action;
            const pr = event.payload.pull_request;
            const prTitle = pr?.title || 'No title';
            const prUrl = pr?.html_url || '';

            return `📌 PullRequest ${action.toUpperCase()} - ${event.repo.name}
          • ${prTitle}
          🔗 ${prUrl}
          🕒 ${date}`;
          }else if (event.type === 'IssueCommentEvent') {
              const comment = event.payload.comment;
              const issue = event.payload.issue;
              const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

              return `💬 Issue Comment - ${event.repo.name}
              • ${comment?.body?.slice(0, 100) || 'No content'}...
              🔗 ${comment?.html_url || ''}
              🕒 ${date}`;
            } else if (event.type === 'PullRequestReviewCommentEvent') {
              const comment = event.payload.comment;
              const pr = event.payload.pull_request;
              const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

              return `📝 PR Review Comment - ${event.repo.name}
              • ${comment?.body?.slice(0, 100) || 'No content'}...
              🔗 ${comment?.html_url || ''}
              🕒 ${date}`;
            } else if (event.type === 'CommitCommentEvent') {
              const comment = event.payload.comment;
              const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

              return `🧾 Commit Comment - ${event.repo.name}
              • ${comment?.body?.slice(0, 100) || 'No content'}...
              🔗 ${comment?.html_url || ''}
              🕒 ${date}`;
            }else {
            const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
            return `📌 ${event.type} - ${event.repo.name}\n  🕒 ${date}`;
          }
      }).filter(Boolean).join('\n\n');

      return summary || '어제 활동 내역이 없습니다.'


    }catch(err){
      console.error('GitHub API 호출 실패:', err);
      return 'GitHub API 호출에 실패했습니다.';
    }

    // const eventUrl = `https://api.github.com/users/${githubUsername}/events?per_page=100&page=1`;

    
    // try{
    //     const response = await axios.get(eventUrl,{
    //         headers:{
    //           Authorization : `Bearer ${githubToken}`,
    //           Accept : 'application/vnd.github+json',

    //         }
    //       });
    //       console.log('깃data', response.data);
    //       const filteredEvents = response.data.filter((event: any) =>{
    //         const createdAt = new Date(event.created_at);
    //         return createdAt >= utcStartOfToday && createdAt <= utcEndOfToday;
    //       });
    //       console.log('filteredEvents', filteredEvents);

    //      const summary = filteredEvents.map((event: any) => {
    //     if (event.type === 'PushEvent' && event.payload?.commits?.length) {
    //       const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    //       const branch = event.payload.ref?.replace('refs/heads/', '');
    //       return `📌 Push - ${event.repo.name} (${branch})
    //   - ${event.payload.commits.map((c: any) =>` • ${c.message}`).join('\n- ')}
    //   🔗 https://github.com/${event.repo.name}/commit/${event.payload.commits[0].sha}
    //   🕒 ${date}`;
    //     } else if (event.type === 'CreateEvent') {
    //       const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    //       const refType = event.payload.ref_type;
    //       const ref = event.payload.ref || '';
    //       return `📎 Create - ${refType} ${ref} @ ${event.repo.name}
    //   🕒 ${date}`;
    //     } else if (event.type === 'PullRequestEvent') {
    //         const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    //         const action = event.payload.action;
    //         const pr = event.payload.pull_request;
    //         const prTitle = pr?.title || 'No title';
    //         const prUrl = pr?.html_url || '';

    //         return `📌 PullRequest ${action.toUpperCase()} - ${event.repo.name}
    //       • ${prTitle}
    //       🔗 ${prUrl}
    //       🕒 ${date}`;
    //       }else if (event.type === 'IssueCommentEvent') {
    //         const comment = event.payload.comment;
    //         const issue = event.payload.issue;
    //         const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    //         return `💬 Issue Comment - ${event.repo.name}
    //         • ${comment?.body?.slice(0, 100) || 'No content'}...
    //         🔗 ${comment?.html_url || ''}
    //         🕒 ${date}`;
    //       } else if (event.type === 'PullRequestReviewCommentEvent') {
    //         const comment = event.payload.comment;
    //         const pr = event.payload.pull_request;
    //         const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    //         return `📝 PR Review Comment - ${event.repo.name}
    //         • ${comment?.body?.slice(0, 100) || 'No content'}...
    //         🔗 ${comment?.html_url || ''}
    //         🕒 ${date}`;
    //       } else if (event.type === 'CommitCommentEvent') {
    //         const comment = event.payload.comment;
    //         const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    //         return `🧾 Commit Comment - ${event.repo.name}
    //         • ${comment?.body?.slice(0, 100) || 'No content'}...
    //         🔗 ${comment?.html_url || ''}
    //         🕒 ${date}`;
    //       }else {
    //         const date = new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    //         return `📌 ${event.type} - ${event.repo.name}\n  🕒 ${date}`;
    //       }
    //   }).filter(Boolean).join('\n\n');

    //   return summary || '오늘 활동 내역이 없습니다.'

    // }catch (err) {
    //     console.error('GitHub API 호출 실패:', err);

    // }

   

  
};


function convertUTCToKST(utcDateString: string): Date {
  const utcDate = new Date(utcDateString);
  return new Date(utcDate.getTime() + 9 * 60 * 60 * 1000); // KST = UTC + 9
}



