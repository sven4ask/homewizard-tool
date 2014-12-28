var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var EnergySchema = new Schema({
  date: { type: Date},
  power: { type: Number}
});

var Energy = mongoose.model('Energy', EnergySchema);

module.exports = Energy;
