// utils/reactionVote.js
const UPVOTE = '⬆️';
const DOWNVOTE = '⬇️';

/**
 * Runs an upvote/downvote reaction vote on a message.
 * Each user gets one vote: picking the other arrow switches their vote,
 * and removing their reaction takes their vote back.
 *
 * @returns {Promise<{ upvoters: string[], downvoters: string[] }>} user IDs
 */
async function runReactionVote(message, durationMs) {
  await message.react(UPVOTE);
  await message.react(DOWNVOTE);

  // userId -> the arrow they currently have
  const votes = new Map();

  const collector = message.createReactionCollector({
    filter: (reaction, user) => !user.bot && [UPVOTE, DOWNVOTE].includes(reaction.emoji.name),
    time: durationMs,
    dispose: true, // emit 'remove' when someone takes their reaction off
  });

  collector.on('collect', async (reaction, user) => {
    const vote = reaction.emoji.name;
    votes.set(user.id, vote);

    // Tidy up their other arrow so it's clear which way they voted.
    // Needs Manage Messages; the vote still counts correctly without it.
    const other = message.reactions.cache.get(vote === UPVOTE ? DOWNVOTE : UPVOTE);
    if (other?.users.cache.has(user.id)) {
      await other.users.remove(user.id).catch(() => {});
    }
  });

  collector.on('remove', (reaction, user) => {
    // Only clear it if this was their current vote (not one they switched away from)
    if (votes.get(user.id) === reaction.emoji.name) votes.delete(user.id);
  });

  await new Promise(resolve => collector.once('end', resolve));

  const upvoters = [...votes].filter(([, vote]) => vote === UPVOTE).map(([id]) => id);
  const downvoters = [...votes].filter(([, vote]) => vote === DOWNVOTE).map(([id]) => id);
  return { upvoters, downvoters };
}

module.exports = { runReactionVote };
