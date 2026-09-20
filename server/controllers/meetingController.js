const Meeting = require('../models/Meeting');

// Generates Nexora Connect readable ID like 'NX-7K92-PQ'
function generateMeetingId() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let part1 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  let part2 = '';
  for (let i = 0; i < 2; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NX-${part1}-${part2}`;
}

exports.createMeeting = async (req, res) => {
  try {
    const { title, options, scheduledFor, durationMinutes, waitingRoom } = req.body;
    let meetingId = generateMeetingId();

    // Ensure uniqueness
    let existing = await Meeting.findOne({ meetingId });
    while (existing) {
      meetingId = generateMeetingId();
      existing = await Meeting.findOne({ meetingId });
    }

    const meetingOptions = {
      allowBeforeHost: options?.allowBeforeHost !== undefined ? options.allowBeforeHost : true,
      requireAuth: options?.requireAuth !== undefined ? options.requireAuth : true,
      muteOnEntry: options?.muteOnEntry !== undefined ? options.muteOnEntry : false,
      cameraOffOnEntry: options?.cameraOffOnEntry !== undefined ? options.cameraOffOnEntry : false,
    };

    const isWaitingRoomEnabled = Boolean(waitingRoom || options?.waitingRoom);

    const newMeeting = await Meeting.create({
      meetingId,
      hostId: req.user.id,
      title: title?.trim() || 'Instant Meeting',
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 45,
      options: meetingOptions,
      waitingRoom: isWaitingRoomEnabled,
      startedAt: new Date(),
      participants: [
        {
          userId: req.user.id,
          name: req.user.name,
          email: req.user.email,
          joinedAt: new Date(),
        },
      ],
      status: 'active',
    });

    return res.status(201).json({
      message: 'Meeting created successfully',
      meeting: {
        id: newMeeting._id,
        meetingId: newMeeting.meetingId,
        title: newMeeting.title,
        status: newMeeting.status,
        options: newMeeting.options,
        waitingRoom: newMeeting.waitingRoom,
        scheduledFor: newMeeting.scheduledFor,
        durationMinutes: newMeeting.durationMinutes,
        createdAt: newMeeting.createdAt,
        meetingUrl: `/meeting/${newMeeting.meetingId}`,
      },
    });
  } catch (err) {
    console.error('Create meeting error:', err);
    return res.status(500).json({ error: 'Failed to create meeting.' });
  }
};

exports.scheduleMeeting = async (req, res) => {
  try {
    const { title, scheduledFor, durationMinutes, options, waitingRoom } = req.body;

    if (!scheduledFor) {
      return res.status(400).json({ error: 'Scheduled date and time is required.' });
    }

    let meetingId = generateMeetingId();
    let existing = await Meeting.findOne({ meetingId });
    while (existing) {
      meetingId = generateMeetingId();
      existing = await Meeting.findOne({ meetingId });
    }

    const isWaitingRoomEnabled = Boolean(waitingRoom || options?.waitingRoom);

    const scheduledMeeting = await Meeting.create({
      meetingId,
      hostId: req.user.id,
      title: title?.trim() || 'Scheduled Conference',
      scheduledFor: new Date(scheduledFor),
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 45,
      options: {
        allowBeforeHost: options?.allowBeforeHost !== undefined ? options.allowBeforeHost : true,
        requireAuth: options?.requireAuth !== undefined ? options.requireAuth : true,
        muteOnEntry: options?.muteOnEntry !== undefined ? options.muteOnEntry : false,
        cameraOffOnEntry: options?.cameraOffOnEntry !== undefined ? options.cameraOffOnEntry : false,
      },
      waitingRoom: isWaitingRoomEnabled,
      status: 'active',
    });

    return res.status(201).json({
      message: 'Meeting scheduled successfully',
      meeting: {
        id: scheduledMeeting._id,
        meetingId: scheduledMeeting.meetingId,
        title: scheduledMeeting.title,
        scheduledFor: scheduledMeeting.scheduledFor,
        durationMinutes: scheduledMeeting.durationMinutes,
        options: scheduledMeeting.options,
        waitingRoom: scheduledMeeting.waitingRoom,
        status: scheduledMeeting.status,
        createdAt: scheduledMeeting.createdAt,
      },
    });
  } catch (err) {
    console.error('Schedule meeting error:', err);
    return res.status(500).json({ error: 'Failed to schedule meeting.' });
  }
};

exports.verifyMeeting = async (req, res) => {
  try {
    const rawId = req.params.meetingId || req.body.meetingId;
    if (!rawId) {
      return res.status(400).json({ error: 'Meeting ID is required.' });
    }

    const meetingId = rawId.trim().toUpperCase();
    const meeting = await Meeting.findOne({ meetingId }).populate('hostId', 'name email');

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found. Please check the Meeting ID.' });
    }

    if (meeting.status === 'ended') {
      return res.status(410).json({ error: 'This meeting has already ended.' });
    }

    return res.json({
      valid: true,
      meeting: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        hostName: meeting.hostId ? meeting.hostId.name : 'Host',
        hostEmail: meeting.hostId ? meeting.hostId.email : '',
        hostId: meeting.hostId ? meeting.hostId._id.toString() : null,
        options: meeting.options || {},
        scheduledFor: meeting.scheduledFor,
        durationMinutes: meeting.durationMinutes,
        createdAt: meeting.createdAt,
        status: meeting.status,
      },
    });
  } catch (err) {
    console.error('Verify meeting error:', err);
    return res.status(500).json({ error: 'Server error while verifying meeting.' });
  }
};

exports.recordJoinMeeting = async (req, res) => {
  try {
    const rawId = req.params.meetingId;
    if (!rawId) {
      return res.status(400).json({ error: 'Meeting ID is required.' });
    }

    const meetingId = rawId.trim().toUpperCase();
    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found.' });
    }

    if (meeting.status === 'ended') {
      return res.status(410).json({ error: 'Meeting has already ended.' });
    }

    const userIdStr = (req.user.id || req.user._id).toString();
    const existing = meeting.participants.find(
      (p) => p.userId && p.userId.toString() === userIdStr
    );

    if (!existing) {
      meeting.participants.push({
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email,
        joinedAt: new Date(),
      });
      await meeting.save();
    }

    return res.json({
      message: 'Participant registered successfully.',
      participantsCount: meeting.participants.length,
    });
  } catch (err) {
    console.error('Record join meeting error:', err);
    return res.status(500).json({ error: 'Failed to record participant join.' });
  }
};

exports.getUserMeetings = async (req, res) => {
  try {
    const userId = req.user.id;
    const allMeetings = await Meeting.find({
      $or: [{ hostId: userId }, { 'participants.userId': userId }],
    })
      .populate('hostId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const recentMeetings = allMeetings.map((m) => ({
      id: m._id,
      meetingId: m.meetingId,
      title: m.title,
      status: m.status,
      scheduledFor: m.scheduledFor,
      durationMinutes: m.durationMinutes,
      durationSeconds: m.durationSeconds || 0,
      options: m.options,
      participantsCount: m.participants ? m.participants.length : 1,
      createdAt: m.createdAt,
      endedAt: m.endedAt,
    }));

    const upcomingMeetings = allMeetings
      .filter((m) => m.scheduledFor && new Date(m.scheduledFor) > now && m.status === 'active')
      .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));

    const meetingsToday = allMeetings.filter((m) => new Date(m.createdAt) >= startOfToday).length;
    const totalMeetings = allMeetings.length;

    // Calculate real unique participants across all meetings user was part of
    const uniqueUserKeys = new Set();
    allMeetings.forEach((m) => {
      if (m.participants && m.participants.length > 0) {
        m.participants.forEach((p) => {
          if (p.userId) uniqueUserKeys.add(p.userId.toString());
          else if (p.name) uniqueUserKeys.add(p.name);
        });
      } else {
        uniqueUserKeys.add(m.hostId ? m.hostId.toString() : 'host');
      }
    });
    const participants = uniqueUserKeys.size;

    // Calculate real meeting hours from actual accumulated durationSeconds
    const totalSeconds = allMeetings.reduce((sum, m) => sum + (m.durationSeconds || 0), 0);
    const meetingHours = parseFloat((totalSeconds / 3600).toFixed(1));

    return res.json({
      meetings: recentMeetings,
      upcoming: upcomingMeetings,
      stats: {
        totalMeetings,
        meetingsToday,
        meetingHours,
        participants,
      },
    });
  } catch (err) {
    console.error('Fetch meetings error:', err);
    return res.status(500).json({ error: 'Failed to fetch user meetings.' });
  }
};

exports.endMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { durationSeconds } = req.body || {};
    const meeting = await Meeting.findOne({ meetingId: meetingId.toUpperCase() });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found.' });
    }

    if (meeting.hostId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the host can officially end this meeting.' });
    }

    meeting.status = 'ended';
    meeting.endedAt = new Date();

    if (durationSeconds && typeof durationSeconds === 'number' && durationSeconds > 0) {
      meeting.durationSeconds = Math.round(durationSeconds);
    } else if (meeting.startedAt || meeting.createdAt) {
      const diffSec = Math.max(
        1,
        Math.round((meeting.endedAt - new Date(meeting.startedAt || meeting.createdAt)) / 1000)
      );
      meeting.durationSeconds = diffSec;
    }

    await meeting.save();

    return res.json({
      message: 'Meeting ended successfully.',
      durationSeconds: meeting.durationSeconds,
    });
  } catch (err) {
    console.error('End meeting error:', err);
    return res.status(500).json({ error: 'Failed to end meeting.' });
  }
};

// Meeting Notes
exports.getMeetingNotes = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await Meeting.findOne({ meetingId: meetingId.toUpperCase() });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
    return res.json({ notes: meeting.notes || { content: '' } });
  } catch (err) {
    console.error('Get meeting notes error:', err);
    return res.status(500).json({ error: 'Failed to fetch notes.' });
  }
};

exports.updateMeetingNotes = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { content } = req.body;
    const meeting = await Meeting.findOne({ meetingId: meetingId.toUpperCase() });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });

    meeting.notes = {
      content: content || '',
      updatedAt: new Date(),
      updatedByName: req.user.name || 'Participant',
    };
    await meeting.save();

    return res.json({ message: 'Notes updated.', notes: meeting.notes });
  } catch (err) {
    console.error('Update meeting notes error:', err);
    return res.status(500).json({ error: 'Failed to update notes.' });
  }
};

// Meeting Polls
exports.getMeetingPolls = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await Meeting.findOne({ meetingId: meetingId.toUpperCase() });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
    return res.json({ polls: meeting.polls || [] });
  } catch (err) {
    console.error('Get meeting polls error:', err);
    return res.status(500).json({ error: 'Failed to fetch polls.' });
  }
};

exports.createMeetingPoll = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { question, options } = req.body;
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Question and at least two options are required.' });
    }

    const meeting = await Meeting.findOne({ meetingId: meetingId.toUpperCase() });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });

    const newPoll = {
      pollId: 'poll_' + Math.random().toString(36).substring(2, 9),
      question: question.trim(),
      options: options.map((opt, idx) => ({
        id: 'opt_' + idx,
        text: typeof opt === 'string' ? opt.trim() : opt.text,
        votes: [],
      })),
      creatorName: req.user.name,
      createdAt: new Date(),
      status: 'active',
    };

    meeting.polls.push(newPoll);
    await meeting.save();

    return res.status(201).json({ message: 'Poll created.', poll: newPoll });
  } catch (err) {
    console.error('Create meeting poll error:', err);
    return res.status(500).json({ error: 'Failed to create poll.' });
  }
};

exports.voteMeetingPoll = async (req, res) => {
  try {
    const { meetingId, pollId } = req.params;
    const { optionId } = req.body;
    const voterId = (req.user.id || req.user._id).toString();

    const meeting = await Meeting.findOne({ meetingId: meetingId.toUpperCase() });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });

    const poll = meeting.polls.find((p) => p.pollId === pollId);
    if (!poll) return res.status(404).json({ error: 'Poll not found.' });

    // Remove any previous vote by this user in this poll (one vote per user)
    poll.options.forEach((opt) => {
      opt.votes = opt.votes.filter((v) => v !== voterId);
    });

    // Add vote to chosen option
    const targetOption = poll.options.find((opt) => opt.id === optionId);
    if (targetOption) {
      targetOption.votes.push(voterId);
    }

    await meeting.save();
    return res.json({ message: 'Vote recorded.', poll });
  } catch (err) {
    console.error('Vote meeting poll error:', err);
    return res.status(500).json({ error: 'Failed to submit vote.' });
  }
};

// Meeting Q&A
exports.getMeetingQnA = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await Meeting.findOne({ meetingId: meetingId.toUpperCase() });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
    return res.json({ qna: meeting.qna || [] });
  } catch (err) {
    console.error('Get meeting Q&A error:', err);
    return res.status(500).json({ error: 'Failed to fetch Q&A.' });
  }
};

exports.createMeetingQuestion = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question content is required.' });
    }

    const meeting = await Meeting.findOne({ meetingId: meetingId.toUpperCase() });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });

    const newQuestion = {
      questionId: 'q_' + Math.random().toString(36).substring(2, 9),
      userId: req.user.id,
      userName: req.user.name,
      question: question.trim(),
      upvotes: [],
      answered: false,
      createdAt: new Date(),
    };

    meeting.qna.push(newQuestion);
    await meeting.save();

    return res.status(201).json({ message: 'Question posted.', question: newQuestion });
  } catch (err) {
    console.error('Create meeting question error:', err);
    return res.status(500).json({ error: 'Failed to post question.' });
  }
};

exports.upvoteMeetingQuestion = async (req, res) => {
  try {
    const { meetingId, questionId } = req.params;
    const voterId = (req.user.id || req.user._id).toString();

    const meeting = await Meeting.findOne({ meetingId: meetingId.toUpperCase() });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });

    const q = meeting.qna.find((item) => item.questionId === questionId);
    if (!q) return res.status(404).json({ error: 'Question not found.' });

    if (q.upvotes.includes(voterId)) {
      q.upvotes = q.upvotes.filter((id) => id !== voterId);
    } else {
      q.upvotes.push(voterId);
    }

    await meeting.save();
    return res.json({ message: 'Upvote updated.', question: q });
  } catch (err) {
    console.error('Upvote question error:', err);
    return res.status(500).json({ error: 'Failed to upvote question.' });
  }
};

exports.answerMeetingQuestion = async (req, res) => {
  try {
    const { meetingId, questionId } = req.params;
    const meeting = await Meeting.findOne({ meetingId: meetingId.toUpperCase() });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });

    if (meeting.hostId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the host can mark questions as answered.' });
    }

    const q = meeting.qna.find((item) => item.questionId === questionId);
    if (!q) return res.status(404).json({ error: 'Question not found.' });

    q.answered = !q.answered;
    await meeting.save();

    return res.json({ message: 'Question answer status toggled.', question: q });
  } catch (err) {
    console.error('Answer question error:', err);
    return res.status(500).json({ error: 'Failed to update question status.' });
  }
};

// Invitations
exports.inviteToMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const meeting = await Meeting.findOne({ meetingId: meetingId.toUpperCase() });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });

    const cleanEmail = email.trim().toLowerCase();
    const existing = meeting.invitations.find((inv) => inv.email === cleanEmail);
    if (!existing) {
      meeting.invitations.push({
        email: cleanEmail,
        status: 'pending',
        sentAt: new Date(),
      });
      await meeting.save();
    }

    return res.json({ message: 'Invitation sent.', invitations: meeting.invitations });
  } catch (err) {
    console.error('Invite to meeting error:', err);
    return res.status(500).json({ error: 'Failed to send invitation.' });
  }
};

