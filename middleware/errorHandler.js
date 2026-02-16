export default function errorHandler(err, req, res, _next) {
  console.error('Error:', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  if (err.code === '23505') {
    
    return res.status(409).json({ error: 'Resource already exists' });
  }
  if (err.code === '23503') {
    
    return res.status(400).json({ error: 'Referenced resource not found' });
  }

  const status = err.status || 500;
  const message = err.status ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
}
