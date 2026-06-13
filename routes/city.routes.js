'use strict';
const router            = require('express').Router();
const { API_response }  = require('../helpers');

// value must match THAILAND_CITY enum in constants/enums.js
const CITY_LIST = [
  {
    id:       1,
    value:    'bangkok',
    label:    'Bangkok',
    subLabel: 'Culture & food',
    icon:     '🏙️',
  },
  {
    id:       2,
    value:    'phuket',
    label:    'Phuket',
    subLabel: 'Beach paradise',
    icon:     '🌊',
  },
  {
    id:       3,
    value:    'pattaya',
    label:    'Pattaya',
    subLabel: 'City of entertainment',
    icon:     '🎡',
  },
  {
    id:       4,
    value:    'chiang_mai',
    label:    'Chiang Mai',
    subLabel: 'Culture & nature',
    icon:     '🐘',
  },
  {
    id:       5,
    value:    'koh_samui',
    label:    'Koh Samui',
    subLabel: 'Tropical island',
    icon:     '🏝️',
  },
];

// GET /api/cities  — public, used by frontend to populate city dropdowns
router.get('/', (_req, res) => {
  API_response.OK({ res, message: 'Cities fetched.', payload: CITY_LIST });
});

module.exports = router;
