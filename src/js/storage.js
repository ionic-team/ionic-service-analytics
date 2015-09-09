(function() {

  var Settings = new ionic.io.core.Settings();

  class BucketStorage {
    constructor(name) {
      this.name = name;
      this.baseStorage = ionic.io.core.main.storage;
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

  ionic.io.register('analytics');
  ionic.io.analytics.BucketStorage = BucketStorage;

})();
