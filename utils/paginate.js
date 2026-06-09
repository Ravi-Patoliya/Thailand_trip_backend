'use strict';

const paginate = (query = {}, defaults = {}) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, parseInt(query.limit) || defaults.limit || 20);
  const skip  = (page - 1) * limit;

  let sort = { createdAt: -1 };
  if (query.sort) {
    const order = query.order === 'asc' ? 1 : -1;
    sort = { [query.sort]: order };
  }

  return { page, limit, skip, sort };
};

module.exports = { paginate };
