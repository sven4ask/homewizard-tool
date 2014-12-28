var request = require('request');
var Q = require('q');
var moment = require('moment');
var discovery = "http://gateway.homewizard.nl/discovery.php";

var HomeWizard = function (password){
  this.password = password;
};

HomeWizard.prototype.init = function() {
  thiz = this;
  var deferred = Q.defer();
  request.get(discovery, function(err, resp, body){
    if(err) {
      console.log("Error: ",err);
      return deferred.reject(err);
    }

    body = JSON.parse(body);
    thiz.ip = body.ip;
    thiz.url = "http://"+thiz.ip+"/"+thiz.password+"/";
    deferred.resolve();
  });

  return deferred.promise;
}

HomeWizard.prototype.getStatus = function() {
  var deferred = Q.defer();
  request.get(this.url+"get-status", function(err, resp, body) {
    if(err) {
      console.log("Error: ",err);
      return deferred.reject(err);
    }
    deferred.resolve(JSON.parse(body));
  });
  return deferred.promise;
}

HomeWizard.prototype.getEnergyList = function() {
  var deferred = Q.defer();
  request.get(this.url+"enlist", function(err, resp, body) {
    if(err) {
      console.log("Error: ",err);
      return deferred.reject(err);
    }
    deferred.resolve(JSON.parse(body));
  });
  return deferred.promise;
}

HomeWizard.prototype.getPower = function(from) {
  var deferred = Q.defer();
  request.get(this.url+"en/graph", function(err, resp, body) {
    if(err) {
      console.log("Error: ",err);
      return deferred.reject(err);
    }
    var body = JSON.parse(body);
    var power = [];
    var start = null
    if(from!=null) {
      start = moment(from);
    }
    for(var x in body.response) {
      var time = body.response[x].t;
      if(start==null || (start.isSame(time) || start.isBefore(time))) {
        power.push(body.response[x]);
      }
    }

    deferred.resolve(power);
  });
  return deferred.promise;
}

HomeWizard.prototype.calculateKHW = function () {

  var days = {};
  var count = {};
  this.getPower().then(function(power){
    for(var x in power) {
      var time = moment(power[x].t);
      if(days[time.format('YYYY-MM-DD')]==null) {
        days[time.format('YYYY-MM-DD')] = 0;
        count[time.format('YYYY-MM-DD')] = 0;
      }
      days[time.format('YYYY-MM-DD')] += power[x].po;
      count[time.format('YYYY-MM-DD')] += 1;
    }

    for(var i in days) {
      var minutes =  count[i] * 5;
      var watt = days[i] * 5;
      var total = ((watt / minutes) * (minutes / 60)) / 1000;
      console.log(i," has total watt: "+watt+" in minutes: "+minutes+" total: "+total);
    }
  })
}

module.exports = HomeWizard;
