// src/utils.js
import { i18n } from './language.js';

/**
 * Format ISO date to Discord timestamp (date only)
 */
export function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const timestamp = Math.floor(d.getTime() / 1000);
  return `<t:${timestamp}:d>`;
}

/**
 * Format ISO date to Discord timestamp with time
 */
export function formatDateTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const timestamp = Math.floor(d.getTime() / 1000);
  return `<t:${timestamp}:f>`;
}

/**
 * Get reward info from quest reward object
 */
export function getReward(reward, rewardName) {
  let extraReward = '';
  if (reward?.type === 4 && reward?.premium_orb_quantity) {
    const normalOrbs = String(reward?.orb_quantity || '');
    const premiumOrbs = String(reward?.premium_orb_quantity || '');
    extraReward = `\n**${i18n.reward_name.extra}:** ${String(rewardName).replace(normalOrbs, premiumOrbs)}`;
  }

  let expires = '';
  if (reward?.type === 3 && reward?.expires_at) {
    expires = `\n**${i18n.decor_expires}:** ${formatDate(reward?.expires_at)}`;
  }

  const keyword = Object.keys(i18n.rewards).find(key => reward?.type == key);
  return {
    rewardType: i18n.rewards[String(keyword)] || i18n.error.reward_type,
    extraReward,
    expires
  };
}

/**
 * Helper: stable stringify for comparison (ignores key order)
 */
function stableStringify(obj) {
  if (obj === undefined) return '';
  try {
    const allKeys = [];
    JSON.stringify(obj, (k, v) => { allKeys.push(k); return v; });
    allKeys.sort();
    return JSON.stringify(obj, allKeys);
  } catch (e) {
    return String(obj);
  }
}

/**
 * Compare two quests and detect changes
 */
export function detectQuestChanges(oldQuest, newQuest) {
  const changes = {
    starts_at: false,
    expires_at: false,
    reward_expires: false,
    task_count: false,
    task_changes: false,
    reward_type: false,
    sku_id: false,
    reward_amount: false,
    reward_item_expires: false,
    hero_image: false,
    hero_video: false,
    quest_name: false,
    features: false,
    reward_platforms: false,
    colors: false,
    application_id: false,
    cta_link: false
  };

  const oldConfig = (oldQuest && oldQuest.config) ? oldQuest.config : (oldQuest || {});
  const newConfig = newQuest?.config || {};

  if ((oldConfig.starts_at || '') !== (newConfig.starts_at || '')) {
    changes.starts_at = true;
  }
  if ((oldConfig.expires_at || '') !== (newConfig.expires_at || '')) {
    changes.expires_at = true;
  }

  const oldRewardExp = oldConfig.rewards_config?.rewards_expire_at || '';
  const newRewardExp = newConfig.rewards_config?.rewards_expire_at || '';
  if (oldRewardExp !== newRewardExp) {
    changes.reward_expires = true;
  }

  const oldTasks = oldConfig.task_config_v2?.tasks || {};
  const newTasks = newConfig.task_config_v2?.tasks || {};
  const oldTaskCount = Object.keys(oldTasks).length;
  const newTaskCount = Object.keys(newTasks).length;
  if (oldTaskCount !== newTaskCount) {
    changes.task_count = true;
    changes.task_changes = true;
  } else {
    const oldTasksStr = stableStringify(oldTasks);
    const newTasksStr = stableStringify(newTasks);
    if (oldTasksStr !== newTasksStr) {
      changes.task_changes = true;
    }
  }

  const oldReward = oldConfig.rewards_config?.rewards?.[0] || {};
  const newReward = newConfig.rewards_config?.rewards?.[0] || {};
  if ((oldReward.type || '') !== (newReward.type || '')) {
    changes.reward_type = true;
  }
  if ((oldReward.sku_id || '') !== (newReward.sku_id || '')) {
    changes.sku_id = true;
  }
  // Orb amount (normal or premium) changing, e.g. 700 -> 900 orbs — this is
  // exactly the kind of change state.js's hash already caught that this
  // function was missing before.
  if ((oldReward.orb_quantity ?? '') !== (newReward.orb_quantity ?? '') ||
      (oldReward.premium_orb_quantity ?? '') !== (newReward.premium_orb_quantity ?? '')) {
    changes.reward_amount = true;
  }
  // A decoration reward's own expiry (distinct from rewards_expire_at, which
  // is the overall claim deadline, not the item's own expiry)
  if ((oldReward.expires_at || '') !== (newReward.expires_at || '')) {
    changes.reward_item_expires = true;
  }

  const oldHero = oldConfig.assets?.hero || '';
  const newHero = newConfig.assets?.hero || '';
  if (oldHero !== newHero) {
    changes.hero_image = true;
  }
  const oldHeroVideo = oldConfig.assets?.hero_video || oldConfig.assets?.quest_bar_hero_video || '';
  const newHeroVideo = newConfig.assets?.hero_video || newConfig.assets?.quest_bar_hero_video || '';
  if (oldHeroVideo !== newHeroVideo) {
    changes.hero_video = true;
  }

  const oldName = oldConfig.messages?.quest_name || '';
  const newName = newConfig.messages?.quest_name || '';
  if (oldName !== newName) {
    changes.quest_name = true;
  }

  const oldFeatures = Array.isArray(oldConfig.features) ? [...oldConfig.features].sort((a, b) => a - b).join(',') : String(oldConfig.features || '');
  const newFeatures = Array.isArray(newConfig.features) ? [...newConfig.features].sort((a, b) => a - b).join(',') : String(newConfig.features || '');
  if (oldFeatures !== newFeatures) {
    changes.features = true;
  }

  const oldPlatforms = Array.isArray(oldConfig.rewards_config?.platforms) ? [...oldConfig.rewards_config.platforms].sort((a, b) => a - b).join(',') : '';
  const newPlatforms = Array.isArray(newConfig.rewards_config?.platforms) ? [...newConfig.rewards_config.platforms].sort((a, b) => a - b).join(',') : '';
  if (oldPlatforms !== newPlatforms) {
    changes.reward_platforms = true;
  }

  if ((oldConfig.colors?.primary || '') !== (newConfig.colors?.primary || '') ||
      (oldConfig.colors?.secondary || '') !== (newConfig.colors?.secondary || '')) {
    changes.colors = true;
  }

  const oldAppId = oldConfig.application?.id || '';
  const newAppId = newConfig.application?.id || '';
  if (oldAppId !== newAppId) {
    changes.application_id = true;
  }

  const oldCta = oldConfig.cta_config?.link || '';
  const newCta = newConfig.cta_config?.link || '';
  if (oldCta !== newCta) {
    changes.cta_link = true;
  }

  return changes;
}

/**
 * Build change description for embed.
 * Only include lines for fields that actually changed. Every label below is
 * either a real vi-VN.json key, or (where no such key exists —
 * hero_image/hero_video/quest_name/features/application_id/cta_link, and
 * reward type/sku which now share the single real `reward_changed` key)
 * a safe hardcoded Vietnamese fallback via `|| '...'`, so a missing
 * translation renders as reasonable text instead of "undefined" —
 * the previous version referenced i18n.task_keys_old, task_keys_new,
 * reward_type_changed, sku_changed, hero_image_changed, hero_video_changed,
 * quest_name_changed, features_changed, application_changed and cta_changed,
 * none of which exist in your language file.
 */
export function buildChangeDescription(oldQuest, newQuest, changes) {
  const oldConfig = (oldQuest && oldQuest.config) ? oldQuest.config : (oldQuest || {});
  const newConfig = newQuest?.config || {};
  const lines = [];

  if (changes.expires_at) {
    const oldVal = formatDateTime(oldConfig.expires_at) || '—';
    const newVal = formatDateTime(newConfig.expires_at) || '—';
    lines.push(`**${i18n.expires_at_changed}:** ~~${oldVal}~~ → ${newVal}`);
  }

  if (changes.starts_at) {
    const oldVal = formatDateTime(oldConfig.starts_at) || '—';
    const newVal = formatDateTime(newConfig.starts_at) || '—';
    lines.push(`**${i18n.starts_at_changed}:** ~~${oldVal}~~ → ${newVal}`);
  }

  if (changes.reward_expires) {
    const oldExp = formatDate(oldConfig.rewards_config?.rewards_expire_at) || '—';
    const newExp = formatDate(newConfig.rewards_config?.rewards_expire_at) || '—';
    lines.push(`**${i18n.reward_expires}:** ~~${oldExp}~~ → ${newExp}`);
  }

  if (changes.task_count || changes.task_changes) {
    const oldTasks = oldConfig.task_config_v2?.tasks || {};
    const newTasks = newConfig.task_config_v2?.tasks || {};
    const oldKeys = Object.keys(oldTasks);
    const newKeys = Object.keys(newTasks);

    if (JSON.stringify(oldKeys.slice().sort()) !== JSON.stringify(newKeys.slice().sort())) {
      lines.push(`**${i18n.task_count_changed}:** ~~${oldKeys.length}~~ → ${newKeys.length}`);
      lines.push(`~~${oldKeys.length ? oldKeys.join(', ') : '—'}~~ → ${newKeys.length ? newKeys.join(', ') : '—'}`);
    } else {
      const diffs = [];
      for (const k of newKeys) {
        const o = oldTasks[k] || {};
        const n = newTasks[k] || {};
        const oStr = stableStringify({ type: o.type, target: o.target, assets: o.assets || null });
        const nStr = stableStringify({ type: n.type, target: n.target, assets: n.assets || null });
        if (oStr !== nStr) {
          diffs.push(`- ${k}: ~~${o.type || '—'} (${o.target || 0}s)~~ → ${n.type || '—'} (${n.target || 0}s)`);
        }
      }
      if (diffs.length) {
        lines.push(`**${i18n.task_count_changed}:**\n${diffs.join('\n')}`);
      } else {
        lines.push(`**${i18n.task_count_changed}:** ~~${oldKeys.length}~~ → ${newKeys.length}`);
      }
    }
  }

  // Reward type + sku fold into the single real `reward_changed` key —
  // i18n has one "reward changed" concept, not separate ones per field.
  if (changes.reward_type || changes.sku_id) {
    const oldReward = oldConfig.rewards_config?.rewards?.[0] || {};
    const newReward = newConfig.rewards_config?.rewards?.[0] || {};
    const oldLabel = i18n.rewards[String(oldReward.type)] || i18n.error.reward_type;
    const newLabel = i18n.rewards[String(newReward.type)] || i18n.error.reward_type;
    lines.push(
      `**${i18n.reward_changed}:** ~~${oldLabel} (\`${oldReward.sku_id || '—'}\`)~~ → ${newLabel} (\`${newReward.sku_id || '—'}\`)`
    );
  }

  if (changes.reward_amount) {
    const oldReward = oldConfig.rewards_config?.rewards?.[0] || {};
    const newReward = newConfig.rewards_config?.rewards?.[0] || {};
    if ((oldReward.orb_quantity ?? '') !== (newReward.orb_quantity ?? '')) {
      lines.push(`**${i18n.reward_amount_changed || '🔢 Số Lượng Thưởng'}:** ~~${oldReward.orb_quantity ?? '—'}~~ → ${newReward.orb_quantity ?? '—'}`);
    }
    if ((oldReward.premium_orb_quantity ?? '') !== (newReward.premium_orb_quantity ?? '')) {
      lines.push(`**${i18n.reward_name?.extra || 'Phần Thưởng Nitro'}:** ~~${oldReward.premium_orb_quantity ?? '—'}~~ → ${newReward.premium_orb_quantity ?? '—'}`);
    }
  }

  if (changes.reward_item_expires) {
    const oldExp = formatDate(oldConfig.rewards_config?.rewards?.[0]?.expires_at) || '—';
    const newExp = formatDate(newConfig.rewards_config?.rewards?.[0]?.expires_at) || '—';
    lines.push(`**${i18n.decor_expires}:** ~~${oldExp}~~ → ${newExp}`);
  }

  if (changes.hero_image) {
    const oldHero = oldConfig.assets?.hero ? `https://cdn.discordapp.com/${oldConfig.assets.hero}` : '—';
    const newHero = newConfig.assets?.hero ? `https://cdn.discordapp.com/${newConfig.assets.hero}` : '—';
    lines.push(`**${i18n.hero_image_changed || '🖼️ Ảnh Hero'}:** ~~${oldHero}~~ → ${newHero}`);
  }

  if (changes.hero_video) {
    const oldV = oldConfig.assets?.hero_video || oldConfig.assets?.quest_bar_hero_video || '';
    const newV = newConfig.assets?.hero_video || newConfig.assets?.quest_bar_hero_video || '';
    lines.push(`**${i18n.hero_video_changed || '🎬 Video Hero'}:** ~~${oldV ? `\`${oldV}\`` : '—'}~~ → ${newV ? `\`${newV}\`` : '—'}`);
  }

  if (changes.quest_name) {
    const oldName = oldConfig.messages?.quest_name || '—';
    const newName = newConfig.messages?.quest_name || '—';
    lines.push(`**${i18n.quest_name_changed || '📝 Tên Quest'}:** ~~${oldName}~~ → ${newName}`);
  }

  if (changes.features) {
    const oldF = Array.isArray(oldConfig.features) ? oldConfig.features.join(', ') : (oldConfig.features || '—');
    const newF = Array.isArray(newConfig.features) ? newConfig.features.join(', ') : (newConfig.features || '—');
    lines.push(`**${i18n.features_changed || '🧩 Tính Năng'}:** ~~${oldF}~~ → ${newF}`);
  }

  if (changes.application_id) {
    const oldApp = oldConfig.application?.id || '—';
    const newApp = newConfig.application?.id || '—';
    lines.push(`**${i18n.application_changed || '🔗 Ứng Dụng'}:** ~~\`${oldApp}\`~~ → \`${newApp}\``);
  }

  if (changes.reward_platforms) {
    const oldP = Array.isArray(oldConfig.rewards_config?.platforms) ? oldConfig.rewards_config.platforms.join(', ') : '—';
    const newP = Array.isArray(newConfig.rewards_config?.platforms) ? newConfig.rewards_config.platforms.join(', ') : '—';
    lines.push(`**${i18n.reward_platforms_changed || '🎮 Nền Tảng'}:** ~~${oldP}~~ → ${newP}`);
  }

  if (changes.colors) {
    const oldC = `${oldConfig.colors?.primary || '—'} / ${oldConfig.colors?.secondary || '—'}`;
    const newC = `${newConfig.colors?.primary || '—'} / ${newConfig.colors?.secondary || '—'}`;
    lines.push(`**${i18n.colors_changed || '🎨 Màu Sắc'}:** ~~${oldC}~~ → ${newC}`);
  }

  if (changes.cta_link) {
    const oldCta = oldConfig.cta_config?.link || '—';
    const newCta = newConfig.cta_config?.link || '—';
    lines.push(`**${i18n.cta_changed || '🔗 Link CTA'}:** ~~${oldCta}~~ → ${newCta}`);
  }

  return lines.join('\n');
}
