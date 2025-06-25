import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';

export const attachUser = async (req: Request, res: Response, next: NextFunction )=>{
    console.log('req.body:', req.body); // ✅ 실제 Slack 요청 body 확인
    console.log('req.query:', req.query);
    const slackId = req.body.user_id || req.query.slackId; 
    if(!slackId) return next();

    const user = await User.findOne({slackId : slackId});
    if(user){
        (req as any).user = user;
    }

    next();

};