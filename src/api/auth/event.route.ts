import express, { Request, Response } from 'express';

const slackEventRouter = express.Router();

slackEventRouter.post('/', express.json(), async (req: Request, res: Response) => {
  const { type, challenge, event } = req.body;
  console.log('event ! ', req.body);

  // 🔐 Step 1: Slack의 URL 검증 요청 처리
  if (type === 'url_verification') {
     res.status(200).send(challenge); // 문자열 그대로 응답!
     return;
  }

  // 📩 Step 2: 실제 이벤트 처리 예시 (DM 메시지 수신 등)
  if (type === 'event_callback') {
    if (event.type === 'message' && event.channel_type === 'im') {
      console.log('DM 메시지:', event.text);
    }
  }

   res.sendStatus(200);
   return;
});

export default slackEventRouter;
