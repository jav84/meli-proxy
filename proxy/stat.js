function Stat(req,res, timeInMills, count) {

    this.remoteAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress.replace('::ffff:','');
    this.method = req.method;
    this.path = req.url.match('^[^?]*')[0];
    this.responseCode = res.statusCode;
    this.runningAverage = timeInMills;
    this.count = count;
  
  }
  
  Stat.prototype.increment = function(timeInMills) {
        this.count++;
        this.runningAverage=(mappedStat.runningAverage+timeInMills)/2;
  };
  
  module.exports = Stat;
  