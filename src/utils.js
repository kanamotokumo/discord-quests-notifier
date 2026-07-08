// ─── Utility Functions ────────────────────────────────────────────────────
import { i18n } from './language.js';

/**
 * Format ISO date to Discord timestamp
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
 * Compare two quests and detect changes
 */
export function detectQuestChanges(oldQuest, newQuest) {
    const changes = {
        starts_at: false,
        expires_at: false,
        reward_expires: false,
        task_count: false,
        reward_type: false,
        sku_id: false
    };

    const oldConfig = oldQuest?.config || {};
    const newConfig = newQuest?.config || {};

    // Check expiration date
    if (oldConfig.expires_at !== newConfig.expires_at) {
        changes.expires_at = true;
    }

    // Check start date
    if (oldConfig.starts_at !== newConfig.starts_at) {
        changes.starts_at = true;
    }

    // Check reward expiration
    const oldRewardExp = oldConfig.rewards_config?.rewards_expire_at;
    const newRewardExp = newConfig.rewards_config?.rewards_expire_at;
    if (oldRewardExp !== newRewardExp) {
        changes.reward_expires = true;
    }

    // Check task count
    const oldTaskCount = Object.keys(oldConfig.task_config_v2?.tasks || {}).length;
    const newTaskCount = Object.keys(newConfig.task_config_v2?.tasks || {}).length;
    if (oldTaskCount !== newTaskCount) {
        changes.task_count = true;
    }

    // Check reward type
    const oldRewardType = oldConfig.rewards_config?.rewards?.[0]?.type;
    const newRewardType = newConfig.rewards_config?.rewards?.[0]?.type;
    if (oldRewardType !== newRewardType) {
        changes.reward_type = true;
    }

    // Check SKU ID
    const oldSkuId = oldConfig.rewards_config?.rewards?.[0]?.sku_id;
    const newSkuId = newConfig.rewards_config?.rewards?.[0]?.sku_id;
    if (oldSkuId !== newSkuId) {
        changes.sku_id = true;
    }

    return changes;
}

/**
 * Build change description for embed
 */
export function buildChangeDescription(oldQuest, newQuest, changes) {
    const oldConfig = oldQuest?.config || {};
    const newConfig = newQuest?.config || {};
    const lines = [];

    if (changes.expires_at) {
        lines.push(`**${i18n.expires_at_changed}:** ${formatDateTime(oldConfig.expires_at)} → ${formatDateTime(newConfig.expires_at)}`);
    }

    if (changes.starts_at) {
        lines.push(`**${i18n.starts_at_changed}:** ${formatDateTime(oldConfig.starts_at)} → ${formatDateTime(newConfig.starts_at)}`);
    }

    if (changes.reward_expires) {
        const oldExp = formatDate(oldConfig.rewards_config?.rewards_expire_at);
        const newExp = formatDate(newConfig.rewards_config?.rewards_expire_at);
        lines.push(`**${i18n.reward_expires}:** ${oldExp} → ${newExp}`);
    }

    if (changes.task_count) {
        const oldCount = Object.keys(oldConfig.task_config_v2?.tasks || {}).length;
        const newCount = Object.keys(newConfig.task_config_v2?.tasks || {}).length;
        lines.push(`**${i18n.task_count_changed}:** ${oldCount} → ${newCount}`);
    }

    return lines.join('\n');
  } 
