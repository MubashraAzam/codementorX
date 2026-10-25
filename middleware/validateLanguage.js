const { isLanguage, LANGUAGES } = require("../data/curriculum");

// Rejects unknown tracks in :language route params before any DB work happens.
function validateLanguage(req, res, next) {
  if (!isLanguage(req.params.language)) {
    return res.status(400).json({ message: `Unknown track. Expected one of: ${LANGUAGES.join(", ")}` });
  }
  return next();
}

module.exports = { validateLanguage };
