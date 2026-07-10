// src/embed.js
import { i18n } from './language.js';
import { formatDate, getReward, buildChangeDescription } from './utils.js';

const PING_ROLE_ID = process.env.PING_ROLE_ID || '';

/**
 * Safe helpers
 */
function safeJoinArray(val, fallback = '???') {
  if (!val) return fallback;
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
}

/**
 * Build embed for NEW quest
 */
export async function buildNewQuestEmbed(content, quest, assets) {
  const config = quest?.config;
  if (!config) return null;

  const questId = quest.id || '';
  const questName = config.messages?.quest_name || i18n.error.new_quest;
  const questLink = `https://canary.discord.com/quests/${questId}`;

  // content (ping role or simple text). Ping role will handle link delivery.
  let baseContent = content || `Nhiệm vụ mới: ${questName}`;
  if (PING_ROLE_ID) {
    baseContent = `<@&${PING_ROLE_ID}> Nhiệm Vụ mới đã đến !!! [Click vào đây để làm nhiệm vụ](${questLink})`;
  }

  // Dates
  const durationStr = `${formatDate(config.starts_at)} - ${formatDate(config.expires_at)}`;
  const rewardDeadline = formatDate(config.rewards_config?.rewards_expire_at) || '???';

  // Platform and feature (robust extraction)
  const platforms = safeJoinArray(config.platforms, config.platform || 'Đa nền tảng');
  const features = safeJoinArray(config.features, config.feature || '???');

  // Reward
  const primaryReward = config.rewards_config?.rewards?.[0] || null;
  const rewardName = primaryReward?.messages?.name || i18n.error.reward;
  const skuId = primaryReward?.sku_id || '???';
  const rewards = getReward(primaryReward, rewardName); // returns rewardType, extraReward, expires

  // Reward image (show below embed description if exists)
  const rewardImageUrl = primaryReward?.asset ? `https://cdn.discordapp.com/${primaryReward.asset}` : null;

  // Game / Application
  const gameTitle = config.messages?.game_title || i18n.error.game_name;
  const gamePublisher = config.messages?.game_publisher || i18n.error.game_publisher;
  const applicationName = config.application?.name || '???';
  const applicationLink = config.application?.link || questLink;
  const applicationId = config.application?.id || '';

  // Hero image (will appear after description)
  const heroUrl = config.assets?.hero ? `https://cdn.discordapp.com/${config.assets.hero}` : assets.discordQuests;

  // Tasks list
  const taskList = Object.values(config.task_config_v2?.tasks || {})
    .map(task => {
      const minutes = task.target ? Math.round(task.target / 60) : 0;
      const taskType = String(task.type || '').toLowerCase().replace(/_/g, ' ');
      const taskName = taskType ? taskType.replace(/^\w/, c => c.toUpperCase()) : 'Task';
      return `* ${taskName} (${minutes} phút)`;
    })
    .join('\n') || '* ???';

  // Build description: instruction first, then info sections
  const description = [
    `-# *Nếu như không thấy nhiệm vụ trong app Discord, trước hết phải khởi động lại ứng dụng. Nếu vẫn không thấy thì fake IP sang US, UK, v.v. Chúng tôi sẽ gửi thông báo về yêu cầu về IP vào mỗi buổi trưa (nếu có).*`,
    '',
    `## Thông tin nhiệm vụ`,
    `**Thời hạn**: ${durationStr}`,
    `**Hạn chót nhận thưởng**: ${rewardDeadline}`,
    `**Nền tảng nhận**: ${platforms}`,
    `**Game**: ${gameTitle} (${gamePublisher})`,
    `**Application**: ${applicationName} (${applicationId})`,
    `**Tính năng**: ${features}`,
    '',
    `## Yêu cầu`,
    `Người dùng phải hoàn thành một trong các yêu cầu sau:`,
    `${taskList}`,
    '',
    `## Phần thưởng`,
    `**Loại phần thưởng**: ${rewards.rewardType}`,
    `**ID SKU**: \`${skuId}\``,
    `**Phần thưởng**: ${rewardName}${rewards.extraReward || ''}`,
    `${rewards.expires || ''}`,
    '',
    `-# **ID Nhiệm vụ**: ${questId}`
  ].join('\n');

  const embed = {
    title: `Nhiệm Vụ Mới Đã Đến !!! - ${questName}`, // only name, no markdown header or link
    description,
    image: { url: heroUrl }, // hero image appears after description
    footer: { text: `${i18n.quest_id}: ${questId}` }
  };

  // If reward image exists, attach it as a separate embed below (Discord supports multiple embeds)
  const embeds = [embed];
  if (rewardImageUrl) {
    const rewardEmbed = {
      description: `**Ảnh phần thưởng**`,
      image: { url: rewardImageUrl }
    };
    embeds.push(rewardEmbed);
  }

  return {
    username: i18n.name,
    avatar_url: assets.avatarWebhook,
    content: baseContent,
    embeds
  };
}

/**
 * Build embed for UPDATED quest
 * Only list detected changes using buildChangeDescription
 */
export async function buildUpdatedQuestEmbed(content, oldQuest, newQuest, assets, changes) {
  const config = newQuest?.config;
  if (!config) return null;

  const questId = newQuest.id || '';
  const questName = config.messages?.quest_name || i18n.error.new_quest;
  const questLink = `https://canary.discord.com/quests/${questId}`;

  let baseContent = content || `Nhiệm vụ đã cập nhật: ${questName}`;
  if (PING_ROLE_ID) {
    baseContent = `<@&${PING_ROLE_ID}> Nhiệm Vụ đã cập nhật !!! [Click vào đây để xem chi tiết](${questLink})`;
  }

  // Hero image
  const heroUrl = config.assets?.hero ? `https://cdn.discordapp.com/${config.assets.hero}` : assets.discordQuests;

  // Detect changes description (only changed fields)
  const changeDescription = buildChangeDescription(oldQuest, newQuest, changes) || 'Không có thay đổi';

  const description = [
    `-# *Nếu như không thấy nhiệm vụ trong app Discord, trước hết phải khởi động lại ứng dụng. Nếu vẫn không thấy thì fake IP sang US, UK, v.v. Chúng tôi sẽ gửi thông báo về yêu cầu về IP vào mỗi buổi trưa (nếu có).*`,
    '',
    `## Thay đổi`,
    `${changeDescription}`,
    '',
    `-# **ID Nhiệm vụ**: \`${questId}\``
  ].join('\n');

  const embed = {
    title: `Nhiệm Vụ Được Cập Nhật !!! - ${questName}`, // only name
    description,
    image: { url: heroUrl },
    footer: { text: `${i18n.quest_id}: ${questId}` }
  };

  return {
    username: i18n.name,
    avatar_url: assets.avatarWebhook,
    content: baseContent,
    embeds: [embed]
  };
}
