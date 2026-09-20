const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const { verifyToken } = require('../middleware/auth');

router.post('/create', verifyToken, meetingController.createMeeting);
router.post('/', verifyToken, meetingController.createMeeting);
router.post('/schedule', verifyToken, meetingController.scheduleMeeting);
router.get('/verify/:meetingId', meetingController.verifyMeeting);
router.post('/verify', meetingController.verifyMeeting);
router.get('/user-meetings', verifyToken, meetingController.getUserMeetings);
router.post('/:meetingId/join', verifyToken, meetingController.recordJoinMeeting);
router.post('/end/:meetingId', verifyToken, meetingController.endMeeting);

// Collaborative Notes
router.get('/:meetingId/notes', verifyToken, meetingController.getMeetingNotes);
router.put('/:meetingId/notes', verifyToken, meetingController.updateMeetingNotes);

// Live Polls
router.get('/:meetingId/polls', verifyToken, meetingController.getMeetingPolls);
router.post('/:meetingId/polls', verifyToken, meetingController.createMeetingPoll);
router.post('/:meetingId/polls/:pollId/vote', verifyToken, meetingController.voteMeetingPoll);

// Q&A Mode
router.get('/:meetingId/qna', verifyToken, meetingController.getMeetingQnA);
router.post('/:meetingId/qna', verifyToken, meetingController.createMeetingQuestion);
router.post('/:meetingId/qna/:questionId/upvote', verifyToken, meetingController.upvoteMeetingQuestion);
router.put('/:meetingId/qna/:questionId/answer', verifyToken, meetingController.answerMeetingQuestion);

// Meeting Invitations
router.post('/:meetingId/invite', verifyToken, meetingController.inviteToMeeting);

module.exports = router;
