// Middleware ini mengizinkan atau menolak akses berdasarkan role
module.exports = function(allowedRoles) {
  return function(req, res, next) {
    // req.user.role sudah ditambahkan oleh middleware auth.js
    const userRole = req.user.role; 

    if (!allowedRoles.includes(userRole)) {
      // Jika role user TIDAK ada dalam daftar role yang diizinkan
      return res.status(403).json({ 
        msg: 'Akses Ditolak. Anda tidak memiliki izin untuk melakukan aksi ini.' 
      });
    }

    // Jika role diizinkan, lanjutkan
    next();
  };
};