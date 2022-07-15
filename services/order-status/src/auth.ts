import db from './db';

export default async (req, res, next) => {
  req.user = null;
  // Get token from query string
  const token = req.query.token;

  if (!token) {
    next();
    return;
  }

  const usersRef = db.collection('users');
  // Find user by token
  const snapshot = await usersRef.where('token', '==', token).limit(1).get();
  if (snapshot.empty) {
    next();
    return;
  }

  for (const doc of snapshot.docs) {
    // doc.data() must have a token field equals to token given the above query
    req.user = doc.data();
  }
  next();
};
