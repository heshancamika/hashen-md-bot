const { isJidBroadcast, isJidGroup, isJidNewsletter } = require('@whiskeysockets/baileys');
const fs = require('fs/promises')
const path = require('path')
const { DataTypes } = require('sequelize');
const { DATABASE } = require('../lib/database');
const storeDir = path.join(process.cwd(), 'store');

// Cache for frequently accessed data
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds
const writeQueue = new Map();

const readJSON = async (file) => {
  try {
    // Check cache first
    const cacheKey = `read_${file}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const filePath = path.join(storeDir, file);
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    // Cache the result
    cache.set(cacheKey, { data: parsed, timestamp: Date.now() });
    return parsed;
  } catch {
    return [];
  }
};

const writeJSON = async (file, data) => {
  const filePath = path.join(storeDir, file);
  
  // Debounce writes to prevent excessive I/O
  const queueKey = `write_${file}`;
  if (writeQueue.has(queueKey)) {
    clearTimeout(writeQueue.get(queueKey));
  }
  
  const timeoutId = setTimeout(async () => {
    try {
      await fs.mkdir(storeDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      
      // Update cache
      const cacheKey = `read_${file}`;
      cache.set(cacheKey, { data, timestamp: Date.now() });
      
      writeQueue.delete(queueKey);
    } catch (error) {
      console.error('Write error:', error);
      writeQueue.delete(queueKey);
    }
  }, 100); // 100ms debounce
  
  writeQueue.set(queueKey, timeoutId);
};

const saveContact = async (jid, name) => {
  if (!jid || !name || isJidGroup(jid) || isJidBroadcast(jid) || isJidNewsletter(jid)) return;
  const contacts = await readJSON('contact.json');
  const index = contacts.findIndex((contact) => contact.jid === jid);
  if (index > -1) {
    contacts[index].name = name;
  } else {
    contacts.push({ jid, name });
  }
  await writeJSON('contact.json', contacts);
};

const getContacts = async () => {
  try {
    const contacts = await readJSON('contact.json');
    return contacts;
  } catch (error) {
    return [];
  }
};

// Batch processing for messages
let messageBatch = [];
let batchTimeout = null;
const BATCH_SIZE = 10;
const BATCH_DELAY = 2000; // 2 seconds

const processMessageBatch = async () => {
  if (messageBatch.length === 0) return;
  
  const batch = messageBatch.splice(0, BATCH_SIZE);
  const messages = await readJSON('message.json');
  
  for (const { message } of batch) {
    const jid = message.key.remoteJid;
    const id = message.key.id;
    if (!id || !jid || !message) continue;
    
    const index = messages.findIndex((msg) => msg.id === id && msg.jid === jid);
    const timestamp = message.messageTimestamp ? message.messageTimestamp * 1000 : Date.now();
    
    if (index > -1) {
      messages[index].message = message;
      messages[index].timestamp = timestamp;
    } else {
      messages.push({ id, jid, message, timestamp });
    }
  }
  
  await writeJSON('message.json', messages);
  
  // Process remaining batch if any
  if (messageBatch.length > 0) {
    batchTimeout = setTimeout(processMessageBatch, BATCH_DELAY);
  } else {
    batchTimeout = null;
  }
};

const saveMessage = async (message) => {
  const jid = message.key.remoteJid;
  const id = message.key.id;
  if (!id || !jid || !message) return;
  
  // Save contact asynchronously without waiting
  saveContact(message.sender, message.pushName).catch(console.error);
  
  // Add to batch
  messageBatch.push({ message });
  
  // Process batch if it's full or start timer if it's the first message
  if (messageBatch.length >= BATCH_SIZE) {
    if (batchTimeout) {
      clearTimeout(batchTimeout);
      batchTimeout = null;
    }
    processMessageBatch();
  } else if (!batchTimeout) {
    batchTimeout = setTimeout(processMessageBatch, BATCH_DELAY);
  }
};

const loadMessage = async (id) => {
  if (!id) return null;
  const messages = await readJSON('message.json');
  return messages.find((msg) => msg.id === id) || null;
};

const getName = async (jid) => {
  const contacts = await readJSON('contact.json');
  const contact = contacts.find((contact) => contact.jid === jid);
  return contact ? contact.name : jid.split('@')[0].replace(/_/g, ' ');
};

const saveGroupMetadata = async (jid, client) => {
  if (!isJidGroup(jid)) return;
  const groupMetadata = await client.groupMetadata(jid);
  const metadata = {
    jid: groupMetadata.id,
    subject: groupMetadata.subject,
    subjectOwner: groupMetadata.subjectOwner,
    subjectTime: groupMetadata.subjectTime
      ? new Date(groupMetadata.subjectTime * 1000).toISOString()
      : null,
    size: groupMetadata.size,
    creation: groupMetadata.creation ? new Date(groupMetadata.creation * 1000).toISOString() : null,
    owner: groupMetadata.owner,
    desc: groupMetadata.desc,
    descId: groupMetadata.descId,
    linkedParent: groupMetadata.linkedParent,
    restrict: groupMetadata.restrict,
    announce: groupMetadata.announce,
    isCommunity: groupMetadata.isCommunity,
    isCommunityAnnounce: groupMetadata.isCommunityAnnounce,
    joinApprovalMode: groupMetadata.joinApprovalMode,
    memberAddMode: groupMetadata.memberAddMode,
    ephemeralDuration: groupMetadata.ephemeralDuration,
  };

  const metadataList = await readJSON('metadata.json');
  const index = metadataList.findIndex((meta) => meta.jid === jid);
  if (index > -1) {
    metadataList[index] = metadata;
  } else {
    metadataList.push(metadata);
  }
  await writeJSON('metadata.json', metadataList);

  const participants = groupMetadata.participants.map((participant) => ({
    jid,
    participantId: participant.id,
    admin: participant.admin,
  }));
  await writeJSON(`${jid}_participants.json`, participants);
};

const getGroupMetadata = async (jid) => {
  if (!isJidGroup(jid)) return null;
  const metadataList = await readJSON('metadata.json');
  const metadata = metadataList.find((meta) => meta.jid === jid);
  if (!metadata) return null;

  const participants = await readJSON(`${jid}_participants.json`);
  return { ...metadata, participants };
};
const saveMessageCount = async (message) => {
  if (!message) return;
  const jid = message.key.remoteJid;
  const sender = message.key.participant || message.sender;
  if (!jid || !sender || !isJidGroup(jid)) return;

  const messageCounts = await readJSON('message_count.json');
  const index = messageCounts.findIndex((record) => record.jid === jid && record.sender === sender);

  if (index > -1) {
    messageCounts[index].count += 1;
  } else {
    messageCounts.push({ jid, sender, count: 1 });
  }

  await writeJSON('message_count.json', messageCounts);
};

const getInactiveGroupMembers = async (jid) => {
  if (!isJidGroup(jid)) return [];
  const groupMetadata = await getGroupMetadata(jid);
  if (!groupMetadata) return [];

  const messageCounts = await readJSON('message_count.json');
  const inactiveMembers = groupMetadata.participants.filter((participant) => {
    const record = messageCounts.find((msg) => msg.jid === jid && msg.sender === participant.id);
    return !record || record.count === 0;
  });

  return inactiveMembers.map((member) => member.id);
};

const getGroupMembersMessageCount = async (jid) => {
  if (!isJidGroup(jid)) return [];
  const messageCounts = await readJSON('message_count.json');
  const groupCounts = messageCounts
    .filter((record) => record.jid === jid && record.count > 0)
    .sort((a, b) => b.count - a.count);

  return Promise.all(
    groupCounts.map(async (record) => ({
      sender: record.sender,
      name: await getName(record.sender),
      messageCount: record.count,
    }))
  );
};

const getChatSummary = async () => {
  const messages = await readJSON('message.json');
  const distinctJids = [...new Set(messages.map((msg) => msg.jid))];

  const summaries = await Promise.all(
    distinctJids.map(async (jid) => {
      const chatMessages = messages.filter((msg) => msg.jid === jid);
      const messageCount = chatMessages.length;
      const lastMessage = chatMessages.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      )[0];
      const chatName = isJidGroup(jid) ? jid : await getName(jid);

      return {
        jid,
        name: chatName,
        messageCount,
        lastMessageTimestamp: lastMessage ? lastMessage.timestamp : null,
      };
    })
  );

  return summaries.sort(
    (a, b) => new Date(b.lastMessageTimestamp) - new Date(a.lastMessageTimestamp)
  );
};

const saveMessageV1 = saveMessage;
const saveMessageV2 = (message) => {
  return Promise.all([saveMessageV1(message), saveMessageCount(message)]);
};

module.exports = {
    saveContact,
    loadMessage,
    getName,
    getChatSummary,
    saveGroupMetadata,
    getGroupMetadata,
    saveMessageCount,
    getInactiveGroupMembers,
    getGroupMembersMessageCount,
    saveMessage: saveMessageV2,
};

// codes by JawadTechX 
