import dotenv from 'dotenv';
import { createApp } from './app';

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Blog API server running on port ${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
