import sessioon from 'express-session';

declare module 'express-session'{
    interface SessionData{
        user?: {
            id: string,
            email?: string,
            slackId?: string;
        };
    }
}