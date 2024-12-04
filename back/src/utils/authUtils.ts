export const validateAuthToken = (authToken: string | undefined): boolean => {
  const validToken = process.env.AUTH_TOKEN;
  return authToken === validToken;
};
