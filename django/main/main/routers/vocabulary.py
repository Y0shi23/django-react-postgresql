class Vocabulary:
    def db_for_read(self, model, **hints):
        """app1の読み込み操作をapp1_dbにルーティングする"""
        if model._meta.app_label == 'vocabulary':
            return 'vocabulary'
        return None

    def db_for_write(self, model, **hints):
        """app1の書き込み操作をapp1_dbにルーティングする"""
        if model._meta.app_label == 'vocabulary':
            return 'vocabulary'
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """app1内のモデル間でのリレーションを許可"""
        if obj1._meta.app_label == 'vocabulary' and obj2._meta.app_label == 'vocabulary':
            return True
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """app1のマイグレーションをapp1_dbに限定"""
        if app_label == 'vocabulary':
            return db == 'vocabulary'
        return None