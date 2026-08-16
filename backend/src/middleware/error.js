'use strict';

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, details: err.details },
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ error: { message: `Upload error: ${err.message}` } });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: { message: 'Invalid or expired session' } });
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: { message: 'This record already exists' } });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: { message: 'Referenced record does not exist' } });
  }

  console.error('[error]', err);
  const status = err.statusCode || 500;
  const message =
    status >= 500 ? 'Something went wrong on our side' : err.message;
  res.status(status).json({ error: { message } });
};

module.exports = { ApiError, notFound, errorHandler };
