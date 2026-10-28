let ioRef = null;
function setIO(io){ ioRef = io; }
function emitToUser(id, ev, data){ if(ioRef) ioRef.to(`user:${id}`).emit(ev,data); }
function emitToFarmer(id, ev, data){ if(ioRef) ioRef.to(`farmer:${id}`).emit(ev,data); }
function emitToAdmins(ev, data){ if(ioRef) ioRef.to("admins").emit(ev,data); }
module.exports = { setIO, emitToUser, emitToFarmer, emitToAdmins };
