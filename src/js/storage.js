(function() {

  var Settings = new Ionic.IO.Settings();

  class BucketStorage {
    constructor(name) {
      this.name = name;
      this.baseStorage = Ionic.IO.Core.getStorage();
    }

    get(key) {
      return this.baseStorage.retrieveObject(this.scopedKey(key));
    }

    set(key, value) {
      return this.baseStorage.storeObject(this.scopedKey(key), value);
    }

    scopedKey(key) {
      return this.name + '_' + key + '_' + Settings.get('app_id');
    }
  }

  Ionic.namespace('Ionic.AnalyticStorage', 'BucketStorage', BucketStorage, window);

})();
