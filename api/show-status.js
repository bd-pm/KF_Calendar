const SPECIAL_LINEUP_STATUS = {
  show_champion: {
    '2026-05-20': {
      source: 'cancelled',
      raw_title: 'Show Champion - Canceled',
      groups: [],
      episode_number: null,
    },
  },
};

function getSpecialLineupRow(showName, broadDate) {
  return SPECIAL_LINEUP_STATUS[showName]?.[broadDate] || null;
}

module.exports = { SPECIAL_LINEUP_STATUS, getSpecialLineupRow };
