const express = require('express');
const router = express.Router();
const Bookmark = require('../models/bookmarkModel'); // adjust path accordingly

// Show add bookmark form
router.get('/add', (req, res) => {
  res.render('bookmark_add', { error: null, message: null });
});

// Add bookmark - Max 5 bookmarks per user
router.post('/add', async (req, res) => {
  const userId = req.session.userId;
  const { url, title } = req.body;

  try {
    const count = await Bookmark.countDocuments({ userId });
    if (count >= 5) {
      return res.render('bookmark_add', { error: 'Maximum 5 bookmarks allowed.', message: null });
    }
    await new Bookmark({ userId, url, title }).save();
    res.redirect('/bookmark/list');
  } catch (err) {
    res.render('bookmark_add', { error: 'Server error, try again.', message: null });
  }
});

// List bookmarks with pagination & optional search by title/url
router.get('/list', async (req, res) => {
  const userId = req.session.userId;
  const page = Number(req.query.page) || 1;
  const size = 5;
  const search = req.query.search || '';

  try {
    const query = {
      userId,
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } }
      ]
    };

    const bookmarks = await Bookmark.find(query)
      .skip((page - 1) * size)
      .limit(size)
      .sort({ createdAt: -1 });

    const count = await Bookmark.countDocuments(query);
    const totalPages = Math.ceil(count / size);

    res.render('bookmark_list', { bookmarks, page, totalPages, search, error: null });
  } catch (err) {
    res.render('bookmark_list', { bookmarks: [], page: 1, totalPages: 1, search: '', error: 'Server error' });
  }
});

// Show edit form for bookmark
router.get('/:id/edit', async (req, res) => {
  try {
    const bookmark = await Bookmark.findOne({ _id: req.params.id, userId: req.session.userId });
    if (!bookmark) {
      return res.redirect('/bookmark/list');
    }
    res.render('bookmark_edit', { bookmark, error: null });
  } catch {
    res.redirect('/bookmark/list');
  }
});

// Handle bookmark update
router.post('/:id/edit', async (req, res) => {
  const { url, title } = req.body;
  try {
    await Bookmark.updateOne({ _id: req.params.id, userId: req.session.userId }, { url, title });
    res.redirect('/bookmark/list');
  } catch {
    res.render('bookmark_edit', { bookmark: { _id: req.params.id, url, title }, error: 'Update failed' });
  }
});

// Handle bookmark delete
router.post('/:id/delete', async (req, res) => {
  try {
    await Bookmark.deleteOne({ _id: req.params.id, userId: req.session.userId });
  } catch {}
  res.redirect('/bookmark/list');
});

module.exports = router;
