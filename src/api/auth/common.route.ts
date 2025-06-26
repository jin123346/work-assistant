import express from 'express';
import axios from 'axios';
import { checkGithubStatus, getGithubActivitySummary, getTodayGithubActivitySummary, sendGithubConnectMessage, sendSimpleMessage, sendSlackDM } from './slack.service';
import {User} from '../../models/user.model';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

const severBaseURL = process.env.SERVER_BASE_URL!;

router.post('/commons', async(req,res)=>{

    console.log('res data : ',res);

    const { command, user_id } = req.body || {};

     if (!command || !user_id) {
         res.status(400).send('잘못된 요청입니다.');
    }

    try{
         console.log('Received command:', command);
         const user = (req as any).user;
         console.log('user 정보 ',user);

       

        if (command === '/깃허브연결상태') {
            // GitHub 연동 메시지 보내기
           const status =  await checkGithubStatus(user.githubUsername);

           if(status){
               await sendSlackDM({slackId : user.slackId ,slackToken : user.slackToken ,text : 'GitHub 이미 연동 되어있습니다.'});
                 res.status(200).end(); 
                 return;
           }else{
                await sendSlackDM({slackId : user.slackId ,slackToken : user.slackToken ,text : 'GitHub 연동이 필요합니다.'});
                sendGithubConnectMessage({slackId : user.slackId ,slackToken : user.slackToken, status: status} );
                 res.status(200).end(); 
                return;

           }
        }else if(command === '/깃허브연결'){
            const status =  await checkGithubStatus(user.githubUsername);

            // const loginUrl = `${severBaseURL}/api/auth/github/login?slackId=${user.slackId}`;
            sendGithubConnectMessage({slackId : user.slackId ,slackToken : user.slackToken,status: status} );
            res.status(200).end(); 
            return;


        }else if(command === '/어제한일'){

            const user = (req as any).user;
            
            //github 연동 확인 
            if(!user || !user.githubUsername || !user.githubToken){
               await sendSlackDM({
                    slackId: user_id,
                    slackToken: user.slackToken,
                    text: 'GitHub 연동 정보가 없습니다. 먼저 연동해주세요.',
                });
                res.status(200).end();
                return;
            }

            const githubUsername = user.githubUsername;
            const githubToken = user.githubToken;

            const yesterdayActivities = await getGithubActivitySummary(githubUsername,githubToken);
            console.log('어제 활동 내역 : ',yesterdayActivities);


            res.status(200).end();
            return;


        }else if(command === '/오늘한일'){
                const user = (req as any).user;
            
            //github 연동 확인 
            if(!user || !user.githubUsername || !user.githubToken){
               await sendSlackDM({
                    slackId: user_id,
                    slackToken: user.slackToken,
                    text: 'GitHub 연동 정보가 없습니다. 먼저 연동해주세요.',
                });
                res.status(200).end();
                return;
            }

            const githubUsername = user.githubUsername;
            const githubToken = user.githubToken;

            const todayActivities = await getTodayGithubActivitySummary(githubUsername,githubToken);
            console.log('오늘 활동 내역 : ',todayActivities);


            res.status(200).end();
            return;
        }

        res.status(400).send('지원하지 않는 명령어입니다.');

            
    }catch(err){
        console.log(err);

    }
   


});



export default router;