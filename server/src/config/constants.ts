export function getPort() {
  return Number(process.env.PORT ?? 4000);
}

export function getClientOrigin() {
  return process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
}
