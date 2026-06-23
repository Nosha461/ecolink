import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { globalErrorHandler } from './utils/error/index.js';

dotenv.config();
console.log("RESEND KEY:", process.env.RESEND_API_KEY);
console.log("APP FILE LOADED");
console.log("RESEND KEY:", process.env.RESEND_API_KEY);

const app = express();

// ========== ميدلوير الأساسية ==========
app.use(cors({
  origin: "*"
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ده مهم عشان تقرا البيانات

// ========== خدمة الملفات الثابتة (الواجهة) ==========
app.use(express.static('public')); // دي تخلي الـ index.html يشتغل

// ========== Routes ==========
app.use('/uploads', express.static('src/uploads'));
app.use('/api', routes);

// ========== لو دخل على route مش موجود ==========
app.use((req, res, next) => {
  next(new Error('Not Found', { cause: 404 }));
});

// ========== معالجة الأخطاء ==========
app.use(globalErrorHandler);

export default app;

//E:\ECO LINK\ecolink-backend\src\app.js
