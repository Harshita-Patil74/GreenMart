const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

function getClientOrigins(clientUrl, nodeEnv) {
  const configuredUrl = new URL(clientUrl);
  const origins = new Set([configuredUrl.origin]);

  if (nodeEnv !== "production" && LOCAL_HOSTS.includes(configuredUrl.hostname)) {
    const port = configuredUrl.port ? `:${configuredUrl.port}` : "";
    LOCAL_HOSTS.forEach((host) => {
      origins.add(`${configuredUrl.protocol}//${host}${port}`);
    });
  }

  return [...origins];
}

module.exports = getClientOrigins;
