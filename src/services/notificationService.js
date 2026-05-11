const { Expo } = require('expo-server-sdk');

const Link = require('../models/Link');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const expo = new Expo();

const registerPushToken = async (userId, token) => {
  if (!Expo.isExpoPushToken(token)) {
    throw new AppError('Token push de Expo inválido', 400);
  }

  await User.findByIdAndUpdate(
    userId,
    {
      $addToSet: {
        expoPushTokens: token,
      },
    },
    { new: true, upsert: false }
  );
};

const removePushToken = async (userId, token) => {
  await User.findByIdAndUpdate(
    userId,
    {
      $pull: {
        expoPushTokens: token,
      },
    },
    { new: true, upsert: false }
  );
};

const sendHighPriorityReminders = async () => {
  const thresholdDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const groups = await Link.aggregate([
    {
      $match: {
        priority: 'high',
        status: 'pending',
        createdAt: { $lte: thresholdDate },
      },
    },
    {
      $group: {
        _id: '$userId',
        count: { $sum: 1 },
      },
    },
  ]);

  if (!groups.length) {
    return { matched: 0, notified: 0 };
  }

  const userIds = groups.map((group) => group._id).filter(Boolean);
  const users = await User.find(
    {
      _id: { $in: userIds },
      expoPushTokens: { $exists: true, $ne: [] },
    },
    'expoPushTokens name lastPriorityReminderAt'
  );

  const usersMap = new Map(users.map((user) => [user._id.toString(), user]));
  const now = new Date();
  const notifiedUserIds = [];
  const messages = [];

  for (const group of groups) {
    const user = usersMap.get(group._id?.toString());
    if (!user) continue;

    const tokens = (user.expoPushTokens || []).filter((token) => Expo.isExpoPushToken(token));
    if (!tokens.length) continue;

    if (user.lastPriorityReminderAt) {
      const diff = now.getTime() - user.lastPriorityReminderAt.getTime();
      if (diff < 24 * 60 * 60 * 1000) {
        // ya se envió un recordatorio en las últimas 24h
        continue;
      }
    }

    const { count } = group;
    const title = 'Tienes links urgentes pendientes';
    const body =
      count === 1
        ? 'Tienes 1 link de alta prioridad pendiente desde hace más de 3 días.'
        : `Tienes ${count} links de alta prioridad pendientes desde hace más de 3 días.`;

    tokens.forEach((token) => {
      messages.push({
        to: token,
        sound: 'default',
        title,
        body,
        data: {
          screen: 'Home',
          filter: 'highPriority',
        },
      });
    });

    notifiedUserIds.push(user._id);
  }

  if (messages.length) {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        console.error('Error enviando notificaciones push:', error);
      }
    }

    if (notifiedUserIds.length) {
      await User.updateMany(
        { _id: { $in: notifiedUserIds } },
        { $set: { lastPriorityReminderAt: now } }
      );
    }
  }

  return { matched: groups.length, notified: notifiedUserIds.length };
};

module.exports = {
  registerPushToken,
  removePushToken,
  sendHighPriorityReminders,
};
