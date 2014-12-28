var settings = require('./settings');
var HomeWizard = require('./lib/homewizard');
var Energy = require('./model/energy');
var EnergyBackup = require('./model/energybackup');

var mongoose = require('mongoose');
var Q = require('q');
var moment = require('moment');

var hw = new HomeWizard(settings.password);
var interval = settings.interval || 10; // use interval from settings with 10 as default

var mongourl = generateMongoUrl(settings.db);
console.log("URL: ",mongourl);
mongoose.connect(mongourl, function(err) {

  if(err) {
    console.log("Failed to connect: ",err);
    return;
  }
  hw.init().then(function() {

    // Check the last backup date
    syncBackup(1000 * 60 * 5);

    // Sync every second
    startSync(1000 * interval);
  });
});

function startSync(interval) {
  setInterval(function(){
    hw.getEnergyList().then(function(res){

      var now = new Date();
      console.log("Power: "+res.response[0].po+" Energy: "+res.response[0].dayTotal+" at: "+now.toISOString());

      var energy = new Energy({date: now, power: res.response[0].po});
      energy.save(function(err){
        if(err) {
          console.log("Error saving energy: ",err);
          return;
        }

        console.log("Adding energy: "+res.response[0].dayTotal);
      });
    });
  }, interval);
};

function getLastBackupDate() {
  var deferred = Q.defer();
  EnergyBackup.find().sort("-date").limit(-1).exec(function(err, res){
    if(err) {
      console.log("Error: ",err);
      return deferred.reject(err);
    }

    deferred.resolve(res);
  });
  return deferred.promise;
}

function syncBackup(interval) {
  setInterval(function() {
    getLastBackupDate().then(function(res){
      var from = null;
      console.log(res.length);
      if(res.length>=1) {
        from = moment(res[0].date).format("YYYY-MM-DD HH:mm");
        // Add one second
        from += ":01";
      }

      console.log("From: ",from);

      hw.getPower(from).then(function(powerList){
        for(var i in powerList) {
          var power = powerList[i];
          var dateTime = moment(power.t).toDate();

          var energyBackup = new EnergyBackup({date: dateTime, power: power.po});
          energyBackup.save(function(err, res){
            if(err) {
              console.log("Failed storing backup: ",err);
              return;
            }
            console.log("Saved backup: ",moment(res.date).format("YYYY-MM-DD HH:mm"));
          });
        }
      })
    });
  }, interval);
}

function generateMongoUrl(obj) {
  obj.hostname = (obj.hostname || 'localhost');
  obj.port = (obj.port || 27017);
  obj.db = (obj.db || 'test');

  if(obj.username && obj.password){
    return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
  }
  else{
    return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
  }
}
