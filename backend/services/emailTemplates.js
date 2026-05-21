const SUBJECTS = [
  "Quick Check In",
  "Follow Up",
  "Project Update",
  "Hello Again",
  "Thanks",
  "Quick Question",
  "Catch up next week?",
  "Review required",
  "Shared notes"
];

const GREETINGS = [
  "Hi {name},",
  "Hello {name},",
  "Hey {name},",
  "Hi there {name},"
];

const OPENERS = [
  "Hope you are having a productive week so far.",
  "Just wanted to drop a quick line to catch up.",
  "Hope everything is going well on your end.",
  "I'm reaching out to share a quick update on my side.",
  "It's been a little while, so I wanted to touch base."
];

const BODIES = [
  "I was thinking about the proposal we discussed last time. The timeline seems reasonable, and I am excited to kick off the next stage.",
  "I have uploaded the latest draft of our project review document. Please take a look at it when you get a moment and let me know your thoughts.",
  "Regarding the meeting we planned, let's schedule it for Thursday afternoon if that works. I'll send over a calendar invite shortly.",
  "Our team has been making great progress on the new updates. We've optimized the layout and made everything feel a lot smoother.",
  "Let me know if you need any additional resources for the tasks this week. Happy to jump on a quick call if we need to align on details."
];

const SIGN_OFFS = [
  "Best regards,\n{sender}",
  "Warmly,\n{sender}",
  "Thanks again,\n{sender}",
  "Talk soon,\n{sender}",
  "Best,\n{sender}"
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates a randomized email template
 * @param {string} receiverName 
 * @param {string} senderName 
 * @returns {{subject: string, html: string}}
 */
function generateWarmupEmail(receiverName, senderName) {
  const subject = getRandomElement(SUBJECTS);
  
  const greeting = getRandomElement(GREETINGS).replace('{name}', receiverName);
  const opener = getRandomElement(OPENERS);
  const body = getRandomElement(BODIES);
  const signoff = getRandomElement(SIGN_OFFS).replace('{sender}', senderName);

  const textContent = `${greeting}\n\n${opener}\n\n${body}\n\n${signoff}`;
  
  // Format as rich HTML
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 15px;">
      <p style="margin-bottom: 16px;">${greeting}</p>
      <p style="margin-bottom: 16px;">${opener}</p>
      <p style="margin-bottom: 16px;">${body}</p>
      <p style="margin-top: 24px; white-space: pre-line; color: #555555; font-style: italic;">${signoff}</p>
    </div>
  `;

  return {
    subject,
    html: htmlContent,
    text: textContent
  };
}

const SIMPLE_REPLIES = [
  "Thanks for the update, that looks great! Will check this tomorrow.",
  "Received, thank you! I'll review it and get back to you soon.",
  "Sounds perfect, looks good to me! Let's proceed.",
  "Awesome! Thanks for letting me know. I'll take a look.",
  "Got it, talk soon! Have a great day.",
  "Perfect, will check it out and follow up shortly."
];

/**
 * Generates a randomized simple reply body
 * @param {string} senderName 
 * @returns {string}
 */
function generateReply(senderName) {
  const body = getRandomElement(SIMPLE_REPLIES);
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 1.6; color: #333333; max-width: 600px; padding: 15px;">
      <p style="margin-bottom: 16px;">${body}</p>
      <p style="margin-top: 24px; color: #555555; font-style: italic;">Best,<br>${senderName}</p>
    </div>
  `;
}

module.exports = {
  generateWarmupEmail,
  generateReply,
  SUBJECTS
};
