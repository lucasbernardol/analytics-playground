import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import RequestIP from 'request-ip';

import { Middlewares } from './middlewares';
import { routes } from './routes';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use(RequestIP.mw());
app.use(Middlewares.agent());

app.use(morgan('dev'));

app.set('trust proxy', 1);

app.use(routes);

app.listen(3333, () => console.log('\nOK'));
