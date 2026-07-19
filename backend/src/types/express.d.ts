declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: number;
        username: string;
      };
    }
  }
}

export {};
