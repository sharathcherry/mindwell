import serverless from 'serverless-http';
import { createApp } from './index.js';

const app = createApp();

export const handler = serverless(app, {
    request(request, event) {
        request.aws = { event };
    },
});

