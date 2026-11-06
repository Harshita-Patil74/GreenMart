function sendMockEmail({ to }) {
  const recipients = Array.isArray(to) ? to : [to];
  return {
    ok: true,
    accepted: true,
    simulated: true,
    messageId: "mock-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    recipientCount: recipients.length,
  };
}

module.exports = { sendMockEmail };
