import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { apikeys, apikeys_v2 } from 'googleapis/build/src/apis/apikeys';

dotenv.config();

const openai = new OpenAI({
 apiKey : process.env.OPENAI_API_KEY!,
});

type Activity = {
  type: string;
  repo: string;
  branch?: string;
  message: string;
  url: string;
  time: string;
};

export async function summarizeGithubActivity(activities : any[]):  Promise<string>{

    const events = activities.flatMap(mapEventToActivity);
    const summaryPrompt = `
        다음은 GitHub 활동 내역과 일정입니다. 이를 종합해 각 활동은 Slack에 공유할 업무일지 형태로 요약해 주세요.

        - 각 활동은 번호를 붙이고, 활동 유형(Push, PR 등), 저장소 이름, 브랜치 정보, 커밋 또는 PR 메시지, 링크, 시간, 비고를 포함해 주세요.
        - 날짜는 오늘 또는 어제로 명확히 구분되도록 작성해 주세요.
        - 전체 업무 흐름이 한눈에 들어오도록 간결하고 명확하게 정리해 주세요.
        - 비고는 해당 활동의 의도를 요약하거나 설명하는 메모 형식으로 작성해 주세요.
        
        [GitHub 활동]
        ${events.map((act, i) =>
            `[${i + 1}] 📌 ${act.type} - ${act.repo}${act.branch ? ` (${act.branch})` : ''}
            • ${act.message}
            🔗 ${act.url}
            🕒 ${act.time}
            📒 비고: ${getAdditionalNote(act)}`
            ).join('\n\n')}


       🗓️ [일정 이벤트]
          

            ---
            위의 내용을 업무일지 형식으로 요약해 주세요.

            💼 업무일지 예시 포맷:
                📌 Push - my-repo (main)
                - 로그인 로직 수정 및 테스트 코드 추가
                🔗 https://github.com/my-repo/commit/abc123
                🕒 오늘 (2025-06-26 수)
                📒 비고: 기능 안정성 확보


        `;

        
            // 업무일지 예시 포맷:
            // 📌 [활동 유형] - [저장소] ([브랜치])
            // - 메시지
            // 🔗 링크
            // 🕒 날짜 (오늘 / 어제 구분)
            // 📒 비고
            //   ${calendarEvents.map((evt, i) =>
            // `[${i + 1}] 📅 ${evt.title}
            // 🕒 ${evt.startTime} ~ ${evt.endTime}
            // 📍 ${evt.location || '온라인'}
            // 📒 설명: ${evt.description || '내용 없음'}`
            // ).join('\n\n')}
    const chatResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
        {
            role: 'user',
            content: summaryPrompt,
        },
        ],
  });

  return chatResponse.choices[0]?.message?.content?.trim() ?? '요약 생성 실패';
}





function mapEventToActivity(event: any): Activity[] {
const date = formatKoreanDate(event.created_at); 
  const repo = event.repo.name;

  if (event.type === 'PushEvent' && event.payload?.commits?.length) {
    const branch = event.payload.ref?.replace('refs/heads/', '');
    return event.payload.commits.map((commit: any) => ({
      type: 'Push',
      repo,
      branch,
      message: commit.message,
      url: `https://github.com/${repo}/commit/${commit.sha}`,
      time: date,
    }));
  }

  if (event.type === 'PullRequestEvent') {
    const pr = event.payload.pull_request;
    return [{
      type: `PullRequest ${event.payload.action.toUpperCase()}`,
      repo,
      message: pr?.title || 'No title',
      url: pr?.html_url || '',
      time: date,
    }];
  }

  if (event.type === 'IssueCommentEvent') {
    const comment = event.payload.comment;
    return [{
      type: 'Issue Comment',
      repo,
      message: comment?.body?.slice(0, 100) || 'No content',
      url: comment?.html_url || '',
      time: date,
    }];
  }

  if (event.type === 'PullRequestReviewCommentEvent') {
    const comment = event.payload.comment;
    return [{
      type: 'PR Review Comment',
      repo,
      message: comment?.body?.slice(0, 100) || 'No content',
      url: comment?.html_url || '',
      time: date,
    }];
  }

  if (event.type === 'CommitCommentEvent') {
    const comment = event.payload.comment;
    return [{
      type: 'Commit Comment',
      repo,
      message: comment?.body?.slice(0, 100) || 'No content',
      url: comment?.html_url || '',
      time: date,
    }];
  }

  if (event.type === 'CreateEvent') {
    const refType = event.payload.ref_type;
    const ref = event.payload.ref || '';
    return [{
      type: `Create ${refType}`,
      repo,
      message: `Created ${refType} ${ref}`,
      url: `https://github.com/${repo}`,
      time: date,
    }];
  }

  // 그 외 이벤트 (Fallback)
  return [{
    type: event.type,
    repo,
    message: '기타 활동',
    url: `https://github.com/${repo}`,
    time: date,
  }];
}


function getAdditionalNote(act: Activity): string {
  switch (act.type) {
    case 'Push':
      return '코드 수정 및 기능 개선 작업';
    case 'PullRequest OPENED':
      return '새 기능 추가 또는 수정사항 리뷰 요청';
    case 'PullRequest CLOSED':
      return 'PR 병합 완료';
    case 'Issue Comment':
      return '이슈에 대한 의견 공유';
    case 'PR Review Comment':
      return '코드 리뷰 의견 작성';
    case 'Commit Comment':
      return '중요 커밋에 대한 설명';
    case 'Create branch':
      return '새 작업을 위한 브랜치 생성';
    default:
      return '기타 활동';
  }
}


function formatKoreanDate(dateStr: string):string {
    const date = new Date(dateStr);
    const krDate = new Date(date.toLocaleDateString('en-US',{ timeZone: 'Asia/Seoul' }));
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() -1);

    const d = krDate.getDate();
    const y = krDate.getFullYear();
    const m = krDate.getMonth();

    const dayName = krDate.toLocaleDateString('ko-KR',{weekday: 'short'});

    const isToday = krDate.toDateString() === today.toDateString();
    const isYesterday = krDate.toDateString() === yesterday.toDateString();
    const prefix = isToday ? '오늘' : isYesterday ? '어제' : '';


    return `${prefix} (${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')} ${dayName})`;


}


  

